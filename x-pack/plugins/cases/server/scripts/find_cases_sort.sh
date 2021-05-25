#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# Example:
# ./find_cases_sort.sh

# Example with sort args:
# ./find_cases_sort.sh createdAt desc

set -e
./check_env_variables.sh

SORT=${1:-'createdAt'}
ORDER=${2:-'asc'}

curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET "${KIBANA_URL}${SPACE_URL}/api/cases/_find?sortField=$SORT&sortOrder=$ORDER" \
 | jq .
