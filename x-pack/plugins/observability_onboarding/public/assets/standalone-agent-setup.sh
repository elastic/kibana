#!/bin/bash

# Arguments
# ELASTIC_HOST=$1
# ELASTIC_TOKEN=$2

# download and extract Elastic Agent
# curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-8.7.0-linux-x86_64.tar.gz
# tar xzvf elastic-agent-8.7.0-linux-x86_64.tar.gz
# cd elastic-agent-8.7.0-linux-x86_64

# install Elastic Agent
# sudo ./elastic-agent install --url=$ELASTIC_HOST --enrollment-token=$ELASTIC_TOKEN

##  ➜  elastic-agent-8.7.1-linux-x86_64 sudo ./elastic-agent install
##  [sudo] password for oliver:
##  Elastic Agent will be installed at /opt/Elastic/Agent and will run as a service. Do you want to continue? [Y/n]:Y
##  Do you want to enroll this Agent into Fleet? [Y/n]:n
##  Elastic Agent has been successfully installed.

# INSTALL_EXIT_CODE=$?

# check the exit code to determine whether the installation was successful or not
# if [ $INSTALL_EXIT_CODE -eq 0 ]; then
#   INSTALL_RESULT="success"
# else
#   INSTALL_RESULT="failure"
# fi

# call the API with the installation result
# curl -X POST "$KIBANA_HOST/api/observabilityOnboarding/agent-installation-status?host=$ELASTIC_HOST&token=$ELASTIC_TOKEN&result=$INSTALL_RESULT"

########################

API_KEY_ENCODED=$1
STATUS_API_ENDPOINT=$2

pingKibana () {
  echo "  GET $STATUS_API_ENDPOINT?ping=$1"
  curl --request GET \
    --url "$STATUS_API_ENDPOINT?ping=$1" \
    --header "Authorization: ApiKey $API_KEY_ENCODED" \
    --header "Content-Type: application/json" \
    --header "kbn-xsrf: true"
  echo ""
}

echo "Downloading Elastic Agent"
curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-8.7.1-linux-x86_64.tar.gz
pingKibana "ea-download-success"
echo "Extracting Elastic Agent"
tar xzvf elastic-agent-8.7.1-linux-x86_64.tar.gz
pingKibana "ea-extract-success"
echo "Installing Elastic Agent"
cd elastic-agent-8.7.1-linux-x86_64
./elastic-agent install -f
pingKibana "ea-install-success"
echo "Sending status to Kibana..."
pingKibana "ea-status-active"
