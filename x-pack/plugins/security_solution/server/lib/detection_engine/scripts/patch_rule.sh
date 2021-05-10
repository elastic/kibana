#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Uses a default if no argument is specified
RULES=(${@:-./rules/patches/simplest_updated_name.json})

# Example: ./patch_rule.sh
# Example: ./patch_rule.sh ./rules/patches/simplest_updated_name.json
# Example glob: ./patch_rule.sh ./rules/patches/*
for RULE in "${RULES[@]}"
do {
  [ -e "$RULE" ] || continue
  curl -s -k \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X PATCH ${KIBANA_URL}${SPACE_URL}/api/detection_engine/rules \
  -d @${RULE} \
  | jq .;
} &
done

wait
