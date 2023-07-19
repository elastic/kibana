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
if [ "${OS}" == "Linux" ]; then
  if [ "${ARCH}" == "aarch64" ]; then
    arch=arm64
  fi
elif [ "${OS}" == "Darwin" ]; then
  os=darwin
  if [ "${ARCH}" == "arm64" ]; then
    arch=aarch64
  fi
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
  curl --request POST \
    --url "${API_ENDPOINT}/custom_logs/${ONBOARDING_ID}/step/${STEPNAME}" \
    --header "Authorization: ApiKey ${API_KEY_ENCODED}" \
    --header "Content-Type: application/json" \
    --header "kbn-xsrf: true" \
    --data "{\"status\":\"${STATUS}\", \"message\":\"${MESSAGE}\"}" \
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
ELASTIC_AGENT_STATE="$(elastic-agent status | grep -m1 State | sed 's/State: //')"
ELASTIC_AGENT_MESSAGE="$(elastic-agent status | grep -m1 Message | sed 's/Message: //')"
if [ "${ELASTIC_AGENT_STATE}" = "HEALTHY" ] && [ "${ELASTIC_AGENT_MESSAGE}" = "Running" ]; then
  echo "Elastic Agent running"
  echo "Download and save configuration to /opt/Elastic/Agent/elastic-agent.yml"
  updateStepProgress "ea-status" "complete"
else
  updateStepProgress "ea-status" "warning" "Expected agent status HEALTHY / Running but got ${ELASTIC_AGENT_STATE} / ${ELASTIC_AGENT_MESSAGE}"
fi

downloadElasticAgentConfig() {
  echo "Downloading elastic-agent.yml"
  updateStepProgress "ea-config" "loading"
  curl --request GET \
    --url "${API_ENDPOINT}/elastic_agent/config?onboardingId=${ONBOARDING_ID}" \
    --header "Authorization: ApiKey ${API_KEY_ENCODED}" \
    --header "Content-Type: application/json" \
    --header "kbn-xsrf: true" \
    --no-progress-meter \
    --output /opt/Elastic/Agent/elastic-agent.yml

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
  echo "Done with standalone Elastic Agent setup for custom logs. Look for streaming logs to arrive in Kibana"
else
  echo "Done with standalone Elastic Agent setup for custom logs. Make sure to add your configuration to /opt/Elastic/Agent/elastic-agent.yml, then look for streaming logs to arrive in Kibana"
fi
