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

orca=false
if [[ "${EVAL_SHARD_ID:-}" == orcabench || "${NIGHTSHIFT_DATASETS:-}" == orcabench ]]; then
  orca=true
  # Only the suite's own config holds the ORCA key. CI forwards this same input when the native
  # CLI invokes the hook again.
  orca_config="$(printf '%s' "$config" | jq -c '.nightshiftOrcaEs // null')"
  if ! printf '%s' "$orca_config" | jq -e '
    type == "object" and (.url | type == "string" and startswith("https://") and (contains("@") | not))
    and (.apiKey | type == "string" and length > 0 and (contains("REPLACE_ME") | not))
    and (.readableIndices == null or (.readableIndices | type == "string" and length > 0))
  ' >/dev/null 2>&1; then
    echo "nightshift-investigations scout hook: ORCA requires nightshiftOrcaEs.url and apiKey (and a nonempty readableIndices, if set) in the Nightshift evals config" >&2
    exit 1
  fi
  # Replace only this process's target; the existing Nightshift secret is never modified. The
  # hint lands in the agent's manifest, so it comes from config (where a change shows up as a
  # benchmark change) and the fallback names the indices without hinting at an incident window.
  # A profile's named default must not override the ORCA shard's telemetry connector.
  config="$(printf '%s' "$config" | HOOK_ORCA_CONFIG="$orca_config" jq '
    .nightshift.telemetry = ({
      readableIndices: "Read logs-orcabench.otel-*, traces-orcabench.otel-* and metrics-orcabench.otel-*."
    } + ($ENV.HOOK_ORCA_CONFIG | fromjson | with_entries(select(.value != null))))
    | del(.nightshift.defaultTelemetryTarget)')"
fi

# The telemetry URL and key come from one source, so a partial profile block is never completed
# from the shell. The optional readable-indices hint falls back independently.
telemetry_url="$(config_value '.nightshift.telemetry.url')"
telemetry_key="$(config_value '.nightshift.telemetry.apiKey')"
if [[ -z "$telemetry_url$telemetry_key" ]]; then
  telemetry_url="${NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL:-}"
  telemetry_key="${NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY:-}"
fi
readable_indices="$(resolve NIGHTSHIFT_SANDBOX_READABLE_INDICES '.nightshift.telemetry.readableIndices')"

telemetry_config=''
if [[ -n "$telemetry_url$telemetry_key$readable_indices" ]]; then
  if [[ -z "$telemetry_url" || -z "$telemetry_key" ]]; then
    echo "nightshift-investigations scout hook: remote telemetry requires both URL and API key" \
      "from one source (nightshift.telemetry or NIGHTSHIFT_SANDBOX_*)" >&2
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

# Named targets coexist on one Scout stack. Each block supplies its own URL and API key.
named_targets="$(printf '%s' "$config" | jq -c '.nightshift.telemetryTargets // {}')"
if ! printf '%s' "$named_targets" | jq -e '
  type == "object" and length <= 20 and all(to_entries[];
    (.key | test("^[a-z][a-z0-9_-]{0,63}$")) and .key != "none" and
    (.value | type == "object") and
    (.value.url | type == "string" and length > 0 and (contains("REPLACE_ME") | not)) and
    (.value.apiKey | type == "string" and length > 0 and (contains("REPLACE_ME") | not)) and
    (.value.readableIndices // "" | type == "string" and length <= 10000)
  )' >/dev/null 2>&1; then
  echo "nightshift-investigations scout hook: each named telemetry target requires a valid name," \
    "URL and API key from its profile block; at most 20 targets are supported" >&2
  exit 1
fi
if printf '%s' "$named_targets" | jq -e 'any(.[]; .url | contains("@"))' >/dev/null; then
  echo "nightshift-investigations scout hook: telemetry URL must not embed credentials" >&2
  exit 1
fi
default_telemetry_target="$(config_value '.nightshift.defaultTelemetryTarget')"
if [[ -n "$default_telemetry_target" && "$default_telemetry_target" != none ]]; then
  if ! printf '%s' "$named_targets" | jq -e --arg target "$default_telemetry_target" 'has($target)' >/dev/null; then
    echo "nightshift-investigations scout hook: default telemetry target must name a configured target or none" >&2
    exit 1
  fi
fi
if [[ "$named_targets" != '{}' || -n "$default_telemetry_target" && -n "$api_key" ]]; then
  if [[ -z "$api_key" ]]; then
    echo "nightshift-investigations scout hook: remote telemetry requires sandbox credentials" >&2
    exit 1
  fi
  # Persist only target names and environment references: never URLs, keys or index hints.
  # A content-derived path keeps unchanged stacks reusable and concurrent hook calls independent.
  config_directory="$script_dir/../../../../../../target/nightshift-evals-telemetry"
  mkdir -p "$config_directory"
  config_directory="$(cd "$config_directory" && pwd)"
  generated_config="$(HOOK_HAS_LEGACY="$telemetry_url" HOOK_DEFAULT_TARGET="$default_telemetry_target" \
    jq -n --argjson names "$(printf '%s' "$named_targets" | jq -c 'keys')" '
      ($names | to_entries) as $targets |
      {
        "xpack.actions.preconfigured": (($targets | map({
          key: ("nightshift-evals-telemetry-" + .value),
          value: {
            name: ("Elasticsearch telemetry: " + .value), actionTypeId: ".http",
            config: {url: ("${NIGHTSHIFT_TELEMETRY_TARGET_" + (.key | tostring) + "_URL}"), hasAuth: false, authType: null},
            secrets: {secretHeaders: {Authorization: ("ApiKey ${NIGHTSHIFT_TELEMETRY_TARGET_" + (.key | tostring) + "_API_KEY}")}}
          }
        }) | from_entries) + (if $ENV.HOOK_HAS_LEGACY != "" then {
          "nightshift-evals-telemetry": {
            name: "Remote Elasticsearch telemetry", actionTypeId: ".http",
            config: {url: "${NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL}", hasAuth: false, authType: null},
            secrets: {secretHeaders: {Authorization: "ApiKey ${NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY}"}}
          }
        } else {} end)),
        "xpack.nightshift_investigations.sandbox": ({
          telemetry_targets: ($targets | map({key: .value, value: {
            connector_id: ("nightshift-evals-telemetry-" + .value),
            readable_indices: ("${NIGHTSHIFT_TELEMETRY_TARGET_" + (.key | tostring) + "_READABLE_INDICES}")
          }}) | from_entries)
        } + (if $ENV.HOOK_DEFAULT_TARGET != "" then {default_telemetry_target: $ENV.HOOK_DEFAULT_TARGET} else {} end)
        + (if $ENV.HOOK_HAS_LEGACY != "" then {
          telemetry_connector_id: "nightshift-evals-telemetry",
          telemetry_readable_indices: "${NIGHTSHIFT_SANDBOX_READABLE_INDICES}"
        } else {} end))
      }')"
  config_hash="$(printf '%s' "$generated_config" | shasum -a 256)"
  config_hash="${config_hash%% *}"
  telemetry_config="$config_directory/$config_hash.yml"
  config_temp="$(mktemp "$config_directory/.telemetry.XXXXXX")"
  printf '%s' "$generated_config" > "$config_temp"
  mv "$config_temp" "$telemetry_config"
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
HOOK_ORCA="$orca" \
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
  HOOK_NAMED_TARGETS="$named_targets" \
  HOOK_DEFAULT_TARGET="$default_telemetry_target" \
  HOOK_KIBANA_CONFIG="$script_dir/kibana.sandbox.yml" \
  jq -n '{
    env: ((if $ENV.HOOK_ORCA == "true" then {
      NIGHTSHIFT_DATASETS: "orcabench", NIGHTSHIFT_ORCA_TELEMETRY: "1"
    } else {} end) + ({
      SANDBOX_API_HOST: $ENV.HOOK_HOST,
      SANDBOX_API_PORT: $ENV.HOOK_PORT,
      SANDBOX_API_KEY: $ENV.HOOK_API_KEY
    } | with_entries(select(.value != ""))) + {
      # kibana.sandbox.yml always references these paths; an empty value leaves the setting unset.
      SANDBOX_CLIENT_CERT_PATH: $ENV.HOOK_CERTIFICATE,
      SANDBOX_CLIENT_KEY_PATH: $ENV.HOOK_KEY,
      SANDBOX_CA_CERT_PATH: $ENV.HOOK_CA,
      SANDBOX_KIBANA_CONFIG: $ENV.HOOK_KIBANA_CONFIG
    } + (if $ENV.HOOK_TELEMETRY_URL != "" then {
      NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: $ENV.HOOK_TELEMETRY_URL,
      NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY: $ENV.HOOK_TELEMETRY_KEY,
      NIGHTSHIFT_SANDBOX_READABLE_INDICES: $ENV.HOOK_READABLE_INDICES
    } else {} end) + (if $ENV.HOOK_NAMED_TARGETS != "{}" then
      ($ENV.HOOK_NAMED_TARGETS | fromjson | to_entries | sort_by(.key) | to_entries |
        map(.key as $index | .value.value as $target | [
          {key: ("NIGHTSHIFT_TELEMETRY_TARGET_" + ($index | tostring) + "_URL"), value: $target.url},
          {key: ("NIGHTSHIFT_TELEMETRY_TARGET_" + ($index | tostring) + "_API_KEY"), value: $target.apiKey},
          {key: ("NIGHTSHIFT_TELEMETRY_TARGET_" + ($index | tostring) + "_READABLE_INDICES"), value: ($target.readableIndices // "")}
        ]) | add | from_entries)
    else {} end) + (if $ENV.HOOK_TELEMETRY_CONFIG != "" then {
      NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG: $ENV.HOOK_TELEMETRY_CONFIG
    } else {} end))
  }'
