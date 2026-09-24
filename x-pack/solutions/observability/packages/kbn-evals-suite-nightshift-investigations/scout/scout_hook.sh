#!/usr/bin/env bash

# Scout hook for the nightshift-investigations eval suite (`scoutHook` in evals.suites.json).
#
# Reads the evals config JSON on stdin and prints `{"env": {...}}`. Sandbox credentials come from the
# config's `sandbox` block, falling back to SANDBOX_* already exported in the shell (e.g. a
# self-hosted sandbox). SANDBOX_KIBANA_CONFIG points the `evals_nightshift_investigations` Scout
# config set at kibana.sandbox.yml, which reads the credentials from the environment. Without an API
# key it prints `{}`, so the config set falls back to plain `evals_tracing` and only smoke runs.

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "nightshift-investigations scout hook: jq is required" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
config="$(cat)"
[[ -n "$config" ]] || config='{}'
if ! jq -e 'type == "object"' <<<"$config" >/dev/null 2>&1; then
  echo "nightshift-investigations scout hook: stdin is not a JSON object" >&2
  exit 1
fi

# Config value at a jq path, ignoring `REPLACE_ME` placeholders, else the named shell variable.
resolve() {
  local env_name="$1" path="$2" from_config
  from_config="$(jq -r --arg placeholder REPLACE_ME \
    "$path // empty | tostring | select(contains(\$placeholder) | not)" <<<"$config")"
  printf '%s' "${from_config:-${!env_name:-}}"
}

host="$(resolve SANDBOX_API_HOST '.sandbox.host')"
port="$(resolve SANDBOX_API_PORT '.sandbox.port')"
api_key="$(resolve SANDBOX_API_KEY '.sandbox.apiKey')"
certificate="$(resolve SANDBOX_CLIENT_CERT '.sandbox.ssl.certificate')"
key="$(resolve SANDBOX_CLIENT_KEY '.sandbox.ssl.key')"
ca="$(resolve SANDBOX_CA_CERT '.sandbox.ssl.certificateAuthorities')"

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

if [[ -z "$certificate" || -z "$key" ]]; then
  echo "nightshift-investigations scout hook: sandbox-api mTLS needs sandbox.ssl.certificate and" \
    "sandbox.ssl.key (or SANDBOX_CLIENT_CERT and SANDBOX_CLIENT_KEY) as PEM contents." >&2
  exit 1
fi

jq -n \
  --arg host "$host" \
  --arg port "$port" \
  --arg api_key "$api_key" \
  --arg certificate "$certificate" \
  --arg key "$key" \
  --arg ca "$ca" \
  --arg kibana_config "$script_dir/kibana.sandbox.yml" \
  '{
    env: (({
      SANDBOX_API_HOST: $host,
      SANDBOX_API_PORT: $port,
      SANDBOX_API_KEY: $api_key,
      SANDBOX_CLIENT_CERT: $certificate,
      SANDBOX_CLIENT_KEY: $key
    } | with_entries(select(.value != ""))) + {
      # kibana.sandbox.yml always references the CA; an empty value means no custom CA.
      SANDBOX_CA_CERT: $ca,
      SANDBOX_KIBANA_CONFIG: $kibana_config
    })
  }'
