#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh


# Example: ./find_rules_statuses_by_ids.sh [\"12345\",\"6789abc\"]
curl -g -k \
  -s \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X POST "${KIBANA_URL}${SPACE_URL}/api/detection_engine/rules/_find_statuses" \
 -d "{\"ids\": $1}" \
 | jq .
