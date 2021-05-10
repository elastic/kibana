#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# Example:
# ./post_case.sh

# Example:
# ./post_case.sh ./mock/case/post_case.json

# Example glob:
# ./post_case.sh ./mock/case/*

set -e
./check_env_variables.sh

# Uses a default if no argument is specified
CASES=(${@:-./mock/case/post_case.json})

for CASE in "${CASES[@]}"
do {
  [ -e "$CASE" ] || continue
  curl -s -k \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST ${KIBANA_URL}${SPACE_URL}/api/cases \
   -d @${CASE} \
  | jq .;
} &
done

wait
