#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

PAGE=${1-1}
PER_PAGE=${2-20}

# Example: ./find_lists.sh 1 20
curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET "${KIBANA_URL}${SPACE_URL}/api/lists/_find?page=${PAGE}&per_page=${PER_PAGE}" | jq .
