#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Uses a default if no argument is specified
TIMELINES=${1:-./rules/export/timelineid_queries.json}


# Example: ./delete_all_alerts.sh
# https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-delete-by-query.html
curl -s -k \
  -H "Content-Type: application/json" \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X DELETE "${KIBANA_URL}${SPACE_URL}/api/timeline" \
  -d @${TIMELINES}

