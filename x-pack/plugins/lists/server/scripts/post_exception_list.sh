#!/bin/bash

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Uses a default if no argument is specified
LISTS=(${@:-./exception_lists/new/exception_list.json})

# Example: ./post_exception_list.sh
# Example: ./post_exception_list.sh ./exception_lists/new/exception_list.json
for LIST in "${LISTS[@]}"
do {
  [ -e "$LIST" ] || continue
  curl -s -k \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST ${KIBANA_URL}${SPACE_URL}/api/exception_lists \
   -d @${LIST} \
  | jq .;
} &
done

wait
