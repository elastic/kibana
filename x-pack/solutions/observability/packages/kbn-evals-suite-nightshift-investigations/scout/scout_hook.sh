#!/usr/bin/env bash

# Scout hook for the nightshift-investigations eval suite (`scoutHook` in evals.suites.json).
#
# Reads the evals config JSON on stdin and prints `{"env": {...}}`. The sandbox API key, `url` and
# optional mTLS file paths (`ssl`) come from the config's `sandbox` block, falling back to SANDBOX_*
# already exported in the shell (e.g. a self-hosted sandbox). The shared sandbox needs only `apiKey`
# and `url`: it authenticates by API key over plain TLS.
# SANDBOX_KIBANA_CONFIG points the `evals_nightshift_investigations` Scout config set at
# kibana.sandbox.yml, which reads the credentials from the environment. Without an API key it prints
# `{}`, so the config set falls back to plain `evals_tracing` and only smoke runs.

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "nightshift-investigations scout hook: jq is required" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
config="$(cat)"
[[ -n "$config" ]] || config='{}'
# Pipe the config rather than use `<<<`: bash before 5.1 (including macOS /bin/bash) backs here-strings
# with a temp file, which would write the API keys to disk.
if ! printf '%s' "$config" | jq -e 'type == "object"' >/dev/null 2>&1; then
  echo "nightshift-investigations scout hook: stdin is not a JSON object" >&2
  exit 1
fi

# Config value at a jq path, ignoring `REPLACE_ME` placeholders.
config_value() {
  printf '%s' "$config" | jq -r --arg placeholder REPLACE_ME \
    "$1 // empty | tostring | select(contains(\$placeholder) | not)"
}

# Config value at a jq path, else the named shell variable.
resolve() {
  local env_name="$1" path="$2" from_config
  from_config="$(config_value "$path")"
  printf '%s' "${from_config:-${!env_name:-}}"
}

api_key="$(resolve SANDBOX_API_KEY '.sandbox.apiKey')"

# Splits `https://host[:port]` into `host` and `port`. Kibana always connects over TLS, so the scheme
# only picks the default port.
parse_url() {
  local url="$1" authority
  authority="${url#*://}"
  authority="${authority%%/*}"
  host="${authority%:*}"
  port="${authority##*:}"
  if [[ "$authority" != *:* ]]; then
    host="$authority"
    [[ "$url" == http://* ]] && port=80 || port=443
  fi
  if [[ -z "$host" || ! "$port" =~ ^[0-9]+$ ]]; then
    echo "nightshift-investigations scout hook: sandbox.url must look like https://host[:port]" >&2
    exit 1
  fi
}

# The profile's `url` takes precedence over any shell address.
profile_url="$(config_value '.sandbox.url')"
if [[ -n "$profile_url" ]]; then
  parse_url "$profile_url"
elif [[ -n "${SANDBOX_API_URL:-}" ]]; then
  parse_url "$SANDBOX_API_URL"
else
  host="${SANDBOX_API_HOST:-}"
  port="${SANDBOX_API_PORT:-}"
fi

# Optional mTLS PEM file paths for a self-hosted sandbox. Older evals configs hold PEM contents
# under `sandbox.ssl`, which Kibana no longer accepts, so inline PEM is ignored rather than read as
# a path.
pem_path() {
  local env_name="$1" path="$2" from_config
  from_config="$(config_value "$path")"
  [[ "$from_config" == *-----BEGIN* ]] && from_config=''
  printf '%s' "${from_config:-${!env_name:-}}"
}
certificate="$(pem_path SANDBOX_CLIENT_CERT_PATH '.sandbox.ssl.certificate')"
key="$(pem_path SANDBOX_CLIENT_KEY_PATH '.sandbox.ssl.key')"
ca="$(pem_path SANDBOX_CA_CERT_PATH '.sandbox.ssl.certificateAuthorities')"

# NIGHTSHIFT_TELEMETRY_TARGET (none | profile; unset: profile when any telemetry setting is set)
# resolves to telemetry_url, telemetry_key and readable_indices for kibana.telemetry.yml. The URL
# and key come from one source, so a partial profile block is never completed from the shell.
profile_url="$(config_value '.nightshift.telemetry.url')"
profile_key="$(config_value '.nightshift.telemetry.apiKey')"
if [[ -z "$profile_url$profile_key" ]]; then
  profile_url="${NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL:-}"
  profile_key="${NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY:-}"
fi
profile_indices="$(resolve NIGHTSHIFT_SANDBOX_READABLE_INDICES '.nightshift.telemetry.readableIndices')"
default_target=none
[[ -n "$profile_url$profile_key$profile_indices" ]] && default_target=profile
telemetry_target="${NIGHTSHIFT_TELEMETRY_TARGET:-$default_target}"

case "$telemetry_target" in
  none) telemetry_url='' telemetry_key='' readable_indices='' ;;
  profile)
    telemetry_url="$profile_url" telemetry_key="$profile_key" readable_indices="$profile_indices"
    ;;
  *)
    echo "nightshift-investigations scout hook: NIGHTSHIFT_TELEMETRY_TARGET must be none or" \
      "profile, got \"$telemetry_target\"" >&2
    exit 1
    ;;
esac

telemetry_config=''
if [[ "$telemetry_target" != none ]]; then
  if [[ -z "$telemetry_url" || -z "$telemetry_key" ]]; then
    echo "nightshift-investigations scout hook: telemetry target $telemetry_target requires both" \
      "URL and API key from one source (nightshift.telemetry or NIGHTSHIFT_SANDBOX_*)" >&2
    exit 1
  fi
  # The URL becomes unredacted connector config, so credentials belong in the API key alone.
  if [[ "$telemetry_url" == *@* ]]; then
    echo "nightshift-investigations scout hook: telemetry URL must not embed credentials" >&2
    exit 1
  fi
  if [[ -z "$api_key" ]]; then
    echo "nightshift-investigations scout hook: remote telemetry requires sandbox credentials" >&2
    exit 1
  fi
  telemetry_config="$script_dir/kibana.telemetry.yml"
fi

if [[ -z "$api_key" ]]; then
  partial=()
  for name in host port certificate key ca; do
    [[ -n "${!name}" ]] && partial+=("$name")
  done
  if [[ ${#partial[@]} -gt 0 ]]; then
    echo "nightshift-investigations scout hook: sandbox ${partial[*]} set without an API key;" \
      "set sandbox.apiKey (or SANDBOX_API_KEY), or remove the sandbox settings to run only smoke." >&2
    exit 1
  fi
  echo '{}'
  exit 0
fi

# The client certificate is optional (without it Kibana authenticates with the API key only), but
# the certificate and key only work as a pair.
if [[ -z "$certificate" && -n "$key" || -n "$certificate" && -z "$key" ]]; then
  echo "nightshift-investigations scout hook: set both sandbox.ssl.certificate and sandbox.ssl.key" \
    "(or SANDBOX_CLIENT_CERT_PATH and SANDBOX_CLIENT_KEY_PATH) as PEM file paths, or neither." >&2
  exit 1
fi

for path in ${certificate:+"$certificate"} ${key:+"$key"} ${ca:+"$ca"}; do
  if [[ ! -r "$path" ]]; then
    echo "nightshift-investigations scout hook: cannot read sandbox PEM file $path" >&2
    exit 1
  fi
done

# Values reach jq through its environment, not `--arg`: argv is visible to any process listing,
# while a process's environment is readable only by its owner.
HOOK_HOST="$host" \
  HOOK_PORT="$port" \
  HOOK_API_KEY="$api_key" \
  HOOK_CERTIFICATE="$certificate" \
  HOOK_KEY="$key" \
  HOOK_CA="$ca" \
  HOOK_TELEMETRY_URL="$telemetry_url" \
  HOOK_TELEMETRY_KEY="$telemetry_key" \
  HOOK_READABLE_INDICES="$readable_indices" \
  HOOK_TELEMETRY_CONFIG="$telemetry_config" \
  HOOK_KIBANA_CONFIG="$script_dir/kibana.sandbox.yml" \
  jq -n '{
    env: (({
      SANDBOX_API_HOST: $ENV.HOOK_HOST,
      SANDBOX_API_PORT: $ENV.HOOK_PORT,
      SANDBOX_API_KEY: $ENV.HOOK_API_KEY
    } | with_entries(select(.value != ""))) + {
      # kibana.sandbox.yml always references these paths; an empty value leaves the setting unset.
      SANDBOX_CLIENT_CERT_PATH: $ENV.HOOK_CERTIFICATE,
      SANDBOX_CLIENT_KEY_PATH: $ENV.HOOK_KEY,
      SANDBOX_CA_CERT_PATH: $ENV.HOOK_CA,
      SANDBOX_KIBANA_CONFIG: $ENV.HOOK_KIBANA_CONFIG
    } + (if $ENV.HOOK_TELEMETRY_CONFIG != "" then {
      NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: $ENV.HOOK_TELEMETRY_URL,
      NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY: $ENV.HOOK_TELEMETRY_KEY,
      NIGHTSHIFT_SANDBOX_READABLE_INDICES: $ENV.HOOK_READABLE_INDICES,
      NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG: $ENV.HOOK_TELEMETRY_CONFIG
    } else {} end))
  }'
