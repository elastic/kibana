#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Example: ./delete_all_statuses.sh
# https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-delete-by-query.html
curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST ${ELASTICSEARCH_URL}/${KIBANA_INDEX}*/_delete_by_query \
  --data '{
    "query": {
      "exists": { "field": "siem-detection-engine-rule-status" }
    }
  }' \
  | jq .
