#!/usr/bin/env bash

# Scout hook for the nightshift-investigations eval suite (`scoutHook` in evals.suites.json).
#
# Reads the evals config JSON on stdin and prints `{"env": {...}}`. The sandbox API key and address
# come from the config's `sandbox` block (`apiKey`, `url`), falling back to SANDBOX_* already
# exported in the shell (e.g. a self-hosted sandbox). Client certificates are only read from
# SANDBOX_*_PATH in the shell: the shared sandbox authenticates by API key over plain TLS.
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

# Config value at a jq path, ignoring `REPLACE_ME` placeholders, else the named shell variable.
resolve() {
  local env_name="$1" path="$2" from_config
  from_config="$(printf '%s' "$config" | jq -r --arg placeholder REPLACE_ME \
    "$path // empty | tostring | select(contains(\$placeholder) | not)")"
  printf '%s' "${from_config:-${!env_name:-}}"
}

api_key="$(resolve SANDBOX_API_KEY '.sandbox.apiKey')"

# `sandbox.url` (e.g. `https://sandbox-api.example.com:443`) carries the gRPC address; Kibana always
# connects over TLS, so the scheme only picks the default port. `host`/`port` are still accepted.
url="$(resolve SANDBOX_API_URL '.sandbox.url')"
if [[ -n "$url" ]]; then
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
else
  host="$(resolve SANDBOX_API_HOST '.sandbox.host')"
  port="$(resolve SANDBOX_API_PORT '.sandbox.port')"
fi

# Optional mTLS for a self-hosted sandbox, from the shell only. Older evals configs carry PEM
# contents under `sandbox.ssl`, which Kibana can no longer read, so that block is ignored.
certificate="${SANDBOX_CLIENT_CERT_PATH:-}"
key="${SANDBOX_CLIENT_KEY_PATH:-}"
ca="${SANDBOX_CA_CERT_PATH:-}"

telemetry_url="$(resolve NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL '.nightshift.telemetry.url')"
telemetry_key="$(resolve NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY '.nightshift.telemetry.apiKey')"
readable_indices="$(resolve NIGHTSHIFT_SANDBOX_READABLE_INDICES '.nightshift.telemetry.readableIndices')"
telemetry_config=''
if [[ -n "$telemetry_url$telemetry_key$readable_indices" ]]; then
  if [[ -z "$telemetry_url" || -z "$telemetry_key" ]]; then
    echo "nightshift-investigations scout hook: remote telemetry requires both URL and API key" >&2
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
  echo "nightshift-investigations scout hook: set both SANDBOX_CLIENT_CERT_PATH and" \
    "SANDBOX_CLIENT_KEY_PATH as PEM file paths, or neither." >&2
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
