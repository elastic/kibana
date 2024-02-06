#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <KIBANA_CONFIG_PATH>"
    exit 1
fi

ELASTICSEARCH_URL="elastic:password@localhost:9200"
KIBANA_CONFIG_PATH="$1" 
TOKEN_NAME="kbn-token-1"

TOKEN=$(curl -s -XPOST "${ELASTICSEARCH_URL}/_security/service/elastic/kibana/credential/token/${TOKEN_NAME}" | jq -r '.token.value')

if [ -z "$(which jq)" ]; then
  echo "jq is not installed. Please install jq to continue."
  exit 1
fi

echo "Elasticsearch URL: ${ELASTICSEARCH_URL}"
echo "Token Value: ${TOKEN}"

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "Updating Kibana config file: ${KIBANA_CONFIG_PATH}"
  if grep -q "elasticsearch.serviceAccountToken" "${KIBANA_CONFIG_PATH}"; then
    echo "Updating existing token value"
    sed -i '' "s/elasticsearch.serviceAccountToken: .*/elasticsearch.serviceAccountToken: \"${TOKEN}\"/" "${KIBANA_CONFIG_PATH}"
  else
    echo "Adding new token value"
    echo "elasticsearch.serviceAccountToken: \"${TOKEN}\"" >> "${KIBANA_CONFIG_PATH}"
  fi
else
  echo "Token not available or null. Unable to update Kibana config."
fi

echo "Changing password for elastic user"
curl -XPOST -u elastic:password "${ELASTICSEARCH_URL}/_security/user/elastic/_password" -H "Content-Type: application/json" -d '{
  "password": "changeme"
}'
