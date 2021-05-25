#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Example: ./delete_all_api_keys.sh
# https://www.elastic.co/guide/en/elasticsearch/reference/current/security-api-invalidate-api-key.html
curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X DELETE ${ELASTICSEARCH_URL}/_security/api_key \
  --data "{
    \"username\": \"${ELASTICSEARCH_USERNAME}\"
  }" \
  | jq .
