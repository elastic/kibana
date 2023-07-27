#!/bin/bash

API_KEY_ENCODED=$1
API_ENDPOINT=$2
ELASTIC_AGENT_VERSION=$3
ONBOARDING_ID=$4
AUTO_DOWNLOAD_CONFIG=$5

updateStepProgress() {
  local STEPNAME="$1"
  local STATUS="$2" # "incomplete" | "complete" | "disabled" | "loading" | "warning" | "danger" | "current"
  curl --request POST \
    --url "${API_ENDPOINT}/custom_logs/${ONBOARDING_ID}/step/${STEPNAME}" \
    --header "Authorization: ApiKey ${API_KEY_ENCODED}" \
    --header "Content-Type: application/json" \
    --header "kbn-xsrf: true" \
    --data "{\"status\":\"${STATUS}\"}" \
    --output /dev/null \
    --no-progress-meter
}

echo "Downloading Elastic Agent archive"
updateStepProgress "ea-download" "loading"
ELASTIC_AGENT_DOWNLOAD_URL="https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${ELASTIC_AGENT_VERSION}-linux-x86_64.tar.gz"
curl -L -O $ELASTIC_AGENT_DOWNLOAD_URL --fail --continue-at -
if [ "$?" -eq 0 ]; then
  echo "Downloaded Elastic Agent"
  updateStepProgress "ea-download" "complete"
else
  updateStepProgress "ea-download" "danger"
  echo "Failed to download Elastic Agent"
  exit 1
fi

echo "Extracting Elastic Agent"
updateStepProgress "ea-extract" "loading"
tar -xzf elastic-agent-${ELASTIC_AGENT_VERSION}-linux-x86_64.tar.gz --checkpoint=.1000
echo ""
if [ "$?" -eq 0 ]; then
  echo "Elastic Agent extracted"
  updateStepProgress "ea-extract" "complete"
else
  updateStepProgress "ea-extract" "danger"
  exit 1
fi

echo "Installing Elastic Agent"
updateStepProgress "ea-install" "loading"
cd elastic-agent-${ELASTIC_AGENT_VERSION}-linux-x86_64
./elastic-agent install -f
if [ "$?" -eq 0 ]; then
  echo "Elastic Agent installed"
  updateStepProgress "ea-install" "complete"
else
  updateStepProgress "ea-install" "danger"
  exit 1
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
if [[ "$?" -ne 0 ]]; then
  updateStepProgress "ea-status" "warning"
  exit 1
fi
ELASTIC_AGENT_STATE="$(elastic-agent status | grep -m1 State | sed 's/State: //')"
ELASTIC_AGENT_MESSAGE="$(elastic-agent status | grep -m1 Message | sed 's/Message: //')"
if [ "${ELASTIC_AGENT_STATE}" = "HEALTHY" ] && [ "${ELASTIC_AGENT_MESSAGE}" = "Running" ]; then
  echo "Elastic Agent running"
  echo "Download and save configuration to /opt/Elastic/Agent/elastic-agent.yml"
  updateStepProgress "ea-status" "complete"
else
  updateStepProgress "ea-status" "warning"
  exit 1
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
    updateStepProgress "ea-config" "warning"
    echo "Failed to download elastic-agent.yml"
    exit 1
  fi

}

if [[ "${AUTO_DOWNLOAD_CONFIG}" == *"autoDownloadConfig=1"* ]]; then
  downloadElasticAgentConfig
  echo "Done with standalone Elastic Agent setup for custom logs. Look for streaming logs to arrive in Kibana."
else
  echo "Done with standalone Elastic Agent setup for custom logs. Make sure to add your configuration to /opt/Elastic/Agent/elastic-agent.yml, then look for streaming logs to arrive in Kibana."
fi

echo "Exit"
exit 0
