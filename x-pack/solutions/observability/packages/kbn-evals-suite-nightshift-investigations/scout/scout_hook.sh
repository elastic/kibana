#!/usr/bin/env bash

# Scout hook for the nightshift-investigations eval suite (`scoutHook` in evals.suites.json).
#
# Reads this suite's config JSON on stdin and prints `{"env": {...}}`. In CI and with the dev-vault
# profile that is the suite's own `nightshift` Vault secret (`vaultSecret`), not the general evals
# config; a file profile passes its config.<profile>.json. The sandbox API key, `url` and
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

# A connector set is the group of preconfigured connectors one Scout stack starts with,
# scout/connector_sets/<set>.yml. The eval saves every connector in the set on the investigator, as
# a user would, and the agent finds them in connectors.md like in production. The ORCA shard uses
# `orcabench`; any other run with Elasticsearch credentials uses `default`.

connector_set=''
es_url=''
es_key=''
if [[ "${EVAL_SHARD_ID:-}" == orcabench || "${NIGHTSHIFT_DATASETS:-}" == orcabench ]]; then
  # Only the suite's own config holds the ORCA key. CI forwards this same input when the native
  # CLI invokes the hook again.
  if ! printf '%s' "$config" | jq -e '.nightshiftOrcaEs |
    type == "object" and (.url | type == "string" and startswith("https://") and (contains("@") | not))
    and (.apiKey | type == "string" and length > 0 and (contains("REPLACE_ME") | not))
  ' >/dev/null 2>&1; then
    echo "nightshift-investigations scout hook: ORCA requires nightshiftOrcaEs.url and apiKey in the Nightshift evals config" >&2
    exit 1
  fi
  connector_set=orcabench
  es_url="$(config_value '.nightshiftOrcaEs.url')"
  es_key="$(config_value '.nightshiftOrcaEs.apiKey')"
else
  # The Elasticsearch URL and key come from one source, so a partial profile block is never
  # completed from the shell. The Vault field keeps its original name, `nightshift.telemetry`.
  es_url="$(config_value '.nightshift.telemetry.url')"
  es_key="$(config_value '.nightshift.telemetry.apiKey')"
  if [[ -z "$es_url$es_key" ]]; then
    es_url="${NIGHTSHIFT_ES_URL:-}"
    es_key="${NIGHTSHIFT_ES_API_KEY:-}"
  fi
  if [[ -n "$es_url$es_key" ]]; then
    if [[ -z "$es_url" || -z "$es_key" ]]; then
      echo "nightshift-investigations scout hook: the default connector set requires both the" \
        "Elasticsearch URL and API key from one source (nightshift.telemetry or NIGHTSHIFT_ES_*)" >&2
      exit 1
    fi
    # The URL becomes unredacted connector config, so credentials belong in the API key alone.
    if [[ "$es_url" == *@* ]]; then
      echo "nightshift-investigations scout hook: the Elasticsearch URL must not embed credentials" >&2
      exit 1
    fi
    connector_set=default
  fi
fi
if [[ -n "$connector_set" && -z "$api_key" ]]; then
  echo "nightshift-investigations scout hook: the $connector_set connector set requires sandbox credentials" >&2
  exit 1
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
  HOOK_CONNECTOR_SET="$connector_set" \
  HOOK_CONNECTORS_CONFIG="${connector_set:+$script_dir/connector_sets/$connector_set.yml}" \
  HOOK_ES_URL="$es_url" \
  HOOK_ES_KEY="$es_key" \
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
    } + (if $ENV.HOOK_CONNECTOR_SET == "" then {} else {
      NIGHTSHIFT_CONNECTOR_SET: $ENV.HOOK_CONNECTOR_SET,
      NIGHTSHIFT_CONNECTORS_KIBANA_CONFIG: $ENV.HOOK_CONNECTORS_CONFIG,
      NIGHTSHIFT_ES_URL: $ENV.HOOK_ES_URL,
      NIGHTSHIFT_ES_API_KEY: $ENV.HOOK_ES_KEY
    } end) + (if $ENV.HOOK_CONNECTOR_SET == "orcabench" then {
      NIGHTSHIFT_DATASETS: "orcabench"
    } else {} end))
  }'
