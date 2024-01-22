#!/bin/bash

set -u

fail() {
  printf "%s\n" "$@" >&2
  exit 1
}

# require bash
if [ -z "${BASH_VERSION:-}" ]; then
  fail "bash required"
fi

if [ $# -lt 4 ]; then
  fail "usage: $0 api_key api_endpoint agent_version onboarding_id [autoDownloadConfig=1]"
fi

API_KEY_ENCODED=$1
API_ENDPOINT=$2
ELASTIC_AGENT_VERSION=$3
ONBOARDING_ID=$4
AUTO_DOWNLOAD_CONFIG=${5:-}

# require curl
[ $(builtin type -P curl) ] || fail "curl required"

# check OS
OS="$(uname)"
ARCH="$(uname -m)"
os=linux
arch=x86_64
cfg=/opt/Elastic/Agent/elastic-agent.yml
if [ "${OS}" == "Linux" ]; then
  if [ "${ARCH}" == "aarch64" ]; then
    arch=arm64
  fi
elif [ "${OS}" == "Darwin" ]; then
  os=darwin
  if [ "${ARCH}" == "arm64" ]; then
    arch=aarch64
  fi
  cfg=/Library/Elastic/Agent/elastic-agent.yml
else
  fail "this script is only supported on linux and macOS"
fi

artifact=elastic-agent-${ELASTIC_AGENT_VERSION}-${os}-${arch}

# https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-8.8.2-darwin-x86_64.tar.gz
# https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-8.8.2-darwin-aarch64.tar.gz
# https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-8.8.2-linux-x86_64.tar.gz
# https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-8.8.2-linux-arm64.tar.gz

updateStepProgress() {
  local STEPNAME="$1"
  local STATUS="$2" # "incomplete" | "complete" | "disabled" | "loading" | "warning" | "danger" | "current"
  local MESSAGE=${3:-}
  local PAYLOAD=${4:-}
  local data=""
  if [ -z "$PAYLOAD" ]; then
    data="{\"status\":\"${STATUS}\", \"message\":\"${MESSAGE}\"}"
  else
    data="{\"status\":\"${STATUS}\", \"message\":\"${MESSAGE}\", \"payload\":${PAYLOAD}}"
  fi
  curl --request POST \
    --url "${API_ENDPOINT}/flow/${ONBOARDING_ID}/step/${STEPNAME}" \
    --header "Authorization: ApiKey ${API_KEY_ENCODED}" \
    --header "Content-Type: application/json" \
    --header "kbn-xsrf: true" \
    --header "x-elastic-internal-origin: Kibana" \
    --data "$data" \
    --output /dev/null \
    --no-progress-meter
}

ELASTIC_AGENT_DOWNLOAD_URL="https://artifacts.elastic.co/downloads/beats/elastic-agent/${artifact}.tar.gz"
echo "Downloading Elastic Agent archive from ${ELASTIC_AGENT_DOWNLOAD_URL}"
updateStepProgress "ea-download" "loading"
curl -L -O $ELASTIC_AGENT_DOWNLOAD_URL --fail
if [ "$?" -eq 0 ]; then
  echo "Downloaded Elastic Agent"
  updateStepProgress "ea-download" "complete"
else
  updateStepProgress "ea-download" "danger" "Failed to download Elastic Agent, see script output for error."
  fail "Failed to download Elastic Agent"
fi

echo "Extracting Elastic Agent"
updateStepProgress "ea-extract" "loading"
tar -xzf ${artifact}.tar.gz
if [ "$?" -eq 0 ]; then
  echo "Elastic Agent extracted"
  updateStepProgress "ea-extract" "complete"
else
  updateStepProgress "ea-extract" "danger" "Failed to extract Elastic Agent, see script output for error."
  fail "Failed to extract Elastic Agent"
fi

echo "Installing Elastic Agent"
updateStepProgress "ea-install" "loading"
cd ${artifact}
./elastic-agent install -f
if [ "$?" -eq 0 ]; then
  echo "Elastic Agent installed"
  updateStepProgress "ea-install" "complete"
else
  updateStepProgress "ea-install" "danger" "Failed to install Elastic Agent, see script output for error."
  fail "Failed to install Elastic Agent"
fi

waitForElasticAgentStatus() {
  local MAX_RETRIES=10
  local i=0
  echo -n "."
  elastic-agent status >/dev/null
  local ELASTIC_AGENT_STATUS_EXIT_CODE="$?"
  while [ "$ELASTIC_AGENT_STATUS_EXIT_CODE" -ne 0 ] && [ $i -le $MAX_RETRIES ]; do
    sleep 1
    echo -n "."
    elastic-agent status >/dev/null
    ELASTIC_AGENT_STATUS_EXIT_CODE="$?"
    ((i++))
  done
  echo ""
  return $ELASTIC_AGENT_STATUS_EXIT_CODE
}

echo "Checking Elastic Agent status"
updateStepProgress "ea-status" "loading"
waitForElasticAgentStatus
if [ "$?" -ne 0 ]; then
  updateStepProgress "ea-status" "warning" "Unable to determine agent status"
fi

# https://www.elastic.co/guide/en/fleet/current/elastic-agent-cmd-options.html#elastic-agent-status-command
ELASTIC_AGENT_STATES=(STARTING CONFIGURING HEALTHY DEGRADED FAILED STOPPING UPGRADING ROLLBACK)

# Get elastic-agent status in json format | removing extra states in the json | finding "state":value | removing , | removing "state": | trimming the result
ELASTIC_AGENT_STATE="$(elastic-agent status --output json | sed -n '/components/q;p' | grep state | sed 's/\(.*\),/\1 /' | sed 's/"state": //' | sed 's/\s//g')"
# Get elastic-agent status in json format | removing extra states in the json | finding "message":value | removing , | removing "message": | trimming the result | removing ""
ELASTIC_AGENT_MESSAGE="$(elastic-agent status --output json | sed -n '/components/q;p' | grep message | sed 's/\(.*\),/\1 /' | sed 's/"message": //' | sed 's/\s//g' | sed 's/\"//g')"
# Get elastic-agent status in json format | removing extra ids in the json | finding "id":value | removing , | removing "id": | trimming the result | removing ""
ELASTIC_AGENT_ID="$(elastic-agent status --output json | sed -n '/components/q;p' | grep id | sed 's/\(.*\),/\1 /' | sed 's/"id": //' | sed 's/\s//g' | sed 's/\"//g')"
if [ "${ELASTIC_AGENT_STATE}" = "2" ] && [ "${ELASTIC_AGENT_MESSAGE}" = "Running" ]; then
  echo "Elastic Agent running (id: ${ELASTIC_AGENT_ID})"
  echo "Download and save configuration to ${cfg}"
  updateStepProgress "ea-status" "complete" "" "{\"agentId\": \"${ELASTIC_AGENT_ID}\"}"
else
  updateStepProgress "ea-status" "warning" "Expected agent status HEALTHY / Running but got ${ELASTIC_AGENT_STATES[ELASTIC_AGENT_STATE]} / ${ELASTIC_AGENT_MESSAGE}"
fi

downloadElasticAgentConfig() {
  echo "Downloading elastic-agent.yml"
  updateStepProgress "ea-config" "loading"
  curl --request GET \
    --url "${API_ENDPOINT}/elastic_agent/config?onboardingId=${ONBOARDING_ID}" \
    --header "Authorization: ApiKey ${API_KEY_ENCODED}" \
    --header "Content-Type: application/json" \
    --header "kbn-xsrf: true" \
    --header "x-elastic-internal-origin: Kibana" \
    --no-progress-meter \
    --output ${cfg}

  if [ "$?" -eq 0 ]; then
    echo "Downloaded elastic-agent.yml"
    updateStepProgress "ea-config" "complete"
  else
    updateStepProgress "ea-config" "warning" "Failed to write elastic-agent.yml on host automatically, try manually setting the configuration"
    fail "Failed to download elastic-agent.yml"
  fi
}

if [ "${AUTO_DOWNLOAD_CONFIG}" == "autoDownloadConfig=1" ]; then
  downloadElasticAgentConfig
  echo "Done with standalone Elastic Agent setup. Look for streaming logs to arrive in Kibana"
else
  echo "Done with standalone Elastic Agent setup. Make sure to add your configuration to ${cfg}, then look for streaming logs to arrive in Kibana"
fi
