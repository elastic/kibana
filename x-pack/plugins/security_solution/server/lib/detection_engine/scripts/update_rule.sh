#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Uses a default if no argument is specified
RULES=(${@:-./rules/updates/simplest_updated_name.json})

# Example: ./update_rule.sh
# Example: ./update_rule.sh ./rules/updates/simplest_updated_name.json
# Example glob: ./update_rule.sh ./rules/updates/*
for RULE in "${RULES[@]}"
do {
  [ -e "$RULE" ] || continue
  curl -s -k \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X PUT ${KIBANA_URL}${SPACE_URL}/api/detection_engine/rules \
  -d @${RULE} \
  | jq .;
} &
done

wait
