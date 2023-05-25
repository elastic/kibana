#!/bin/bash

API_KEY_ENCODED=$1
API_ENDPOINT=$2

updateStepProgress() {
  local STEPNAME="$1"
  local STATUS="$2" # "incomplete" | "complete" | "disabled" | "loading" | "warning" | "danger" | "current"
  curl --request GET \
    --url "${API_ENDPOINT}/step/${STEPNAME}?status=${STATUS} 2023-05-24" \
    --header "Authorization: ApiKey ${API_KEY_ENCODED}" \
    --header "Content-Type: application/json" \
    --header "kbn-xsrf: true" \
    --output /dev/null \
    --no-progress-meter
}

echo "Downloading Elastic Agent archive"
# https://www.elastic.co/guide/en/fleet/8.7/install-standalone-elastic-agent.html
updateStepProgress "ea-download" "loading"
curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-8.7.1-linux-x86_64.tar.gz --fail --continue-at -
if [ "$?" -eq 0 ]; then
  echo "Downloaded Elastic Agent"
  updateStepProgress "ea-download" "complete"
else
  updateStepProgress "ea-download" "danger"
  exit 1
fi

echo "Extracting Elastic Agent"
updateStepProgress "ea-extract" "loading"
tar -xzf elastic-agent-8.7.1-linux-x86_64.tar.gz --checkpoint=.1000
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
cd elastic-agent-8.7.1-linux-x86_64
./elastic-agent install -f
if [ "$?" -eq 0 ]; then
  echo "Elastic Agent installed"
  updateStepProgress "ea-install" "complete"
else
  updateStepProgress "ea-install" "danger"
  exit 1
fi

echo "Checking Elastic Agent status"
updateStepProgress "ea-status" "loading"
sleep 4 # wait for Elastic agent to start
ELASTIC_AGENT_STATE="$(elastic-agent status | grep -m1 State | sed 's/State: //')"
ELASTIC_AGENT_MESSAGE="$(elastic-agent status | grep -m1 Message | sed 's/Message: //')"
if [ "${ELASTIC_AGENT_STATE}" = "HEALTHY" ] && [ "${ELASTIC_AGENT_MESSAGE}" = "Running" ]; then
  echo "Elastic Agent connected"
  echo "Download and save configuration to /opt/Elastic/Agent/elastic-agent.yml"
  updateStepProgress "ea-status" "complete"
else
  updateStepProgress "ea-status" "warning"
  exit 1
fi
