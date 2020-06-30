#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Uses a default of 100 if no argument is specified
NUMBER=${1:-100}

# Example: ./post_x_rules.sh
# Example: ./post_x_rules.sh 200
for i in $(seq 1 $NUMBER);
do {
  curl -s -k \
 -H 'Content-Type: application/json' \
 -H 'kbn-xsrf: 123' \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X POST ${KIBANA_URL}${SPACE_URL}/api/detection_engine/rules \
  --data "{
    \"rule_id\": \"${i}\",
    \"risk_score\": \"50\",
    \"description\": \"Detecting root and admin users\",
    \"index\": [\"auditbeat-*\", \"filebeat-*\", \"packetbeat-*\", \"winlogbeat-*\"],
    \"interval\": \"24h\",
    \"name\": \"Detect Root/Admin Users\",
    \"severity\": \"high\",
    \"type\": \"query\",
    \"from\": \"now-6m\",
    \"to\": \"now\",
    \"enabled\": \"false\",
    \"query\": \"user.name: root or user.name: admin\",
    \"language\": \"kuery\"
  }" \
  | jq .;
} &
done

wait