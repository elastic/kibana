#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Example: ./delete_all_alerts.sh
# https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-delete-by-query.html
curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST ${ELASTICSEARCH_URL}/${KIBANA_INDEX}*/_delete_by_query \
  --data '{
    "query": {
      "exists": { "field": "exception-list" }
    }
  }' \
  | jq .

# Deletes all the agnostic namespace version
curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST ${ELASTICSEARCH_URL}/${KIBANA_INDEX}*/_delete_by_query \
  --data '{
    "query": {
      "exists": { "field": "exception-list-agnostic" }
    }
  }' \
  | jq .
