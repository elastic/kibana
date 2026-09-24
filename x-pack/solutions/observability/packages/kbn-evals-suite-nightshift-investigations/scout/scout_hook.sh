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
# Pipe the config rather than use `<<<`: bash before 5.1 (including macOS /bin/bash) backs here-strings
# with a temp file, which would write the private key to disk.
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

# Values reach jq through its environment, not `--arg`: argv is visible to any process listing,
# while a process's environment is readable only by its owner.
HOOK_HOST="$host" \
  HOOK_PORT="$port" \
  HOOK_API_KEY="$api_key" \
  HOOK_CERTIFICATE="$certificate" \
  HOOK_KEY="$key" \
  HOOK_CA="$ca" \
  HOOK_KIBANA_CONFIG="$script_dir/kibana.sandbox.yml" \
  jq -n '{
    env: (({
      SANDBOX_API_HOST: $ENV.HOOK_HOST,
      SANDBOX_API_PORT: $ENV.HOOK_PORT,
      SANDBOX_API_KEY: $ENV.HOOK_API_KEY,
      SANDBOX_CLIENT_CERT: $ENV.HOOK_CERTIFICATE,
      SANDBOX_CLIENT_KEY: $ENV.HOOK_KEY
    } | with_entries(select(.value != ""))) + {
      # kibana.sandbox.yml always references the CA; an empty value means no custom CA.
      SANDBOX_CA_CERT: $ENV.HOOK_CA,
      SANDBOX_KIBANA_CONFIG: $ENV.HOOK_KIBANA_CONFIG
    })
  }'
