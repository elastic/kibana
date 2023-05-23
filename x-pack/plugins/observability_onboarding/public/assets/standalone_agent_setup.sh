#!/bin/bash

API_KEY_ENCODED=$1
API_ENDPOINT=$2

updateStepProgress() {
  echo "  GET $API_ENDPOINT/step/$1?status=$2"
  curl --request GET \
    --url "$API_ENDPOINT/step/$1?status=$2" \
    --header "Authorization: ApiKey $API_KEY_ENCODED" \
    --header "Content-Type: application/json" \
    --header "kbn-xsrf: true"
  echo ""
}

echo "Downloading Elastic Agent"
# https://www.elastic.co/guide/en/fleet/8.7/install-standalone-elastic-agent.html
curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-8.7.1-linux-x86_64.tar.gz
updateStepProgress "ea-download" "success"
echo "Extracting Elastic Agent"
tar xzvf elastic-agent-8.7.1-linux-x86_64.tar.gz
updateStepProgress "ea-extract" "success"
echo "Installing Elastic Agent"
cd elastic-agent-8.7.1-linux-x86_64
./elastic-agent install -f
updateStepProgress "ea-install" "success"
echo "Sending status to Kibana..."
updateStepProgress "ea-status" "active"
