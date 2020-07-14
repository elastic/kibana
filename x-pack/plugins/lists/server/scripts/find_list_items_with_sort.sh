#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

LIST_ID=${1-ip_list}
PAGE=${2-1}
PER_PAGE=${3-20}
SORT_FIELD=${4-value}
SORT_ORDER=${4-asc}

# Example: ./find_list_items_with_sort.sh ip_list 1 20 value asc
curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET "${KIBANA_URL}${SPACE_URL}/api/lists/items/_find?list_id=${LIST_ID}&page=${PAGE}&per_page=${PER_PAGE}&sort_field=${SORT_FIELD}&sort_order=${SORT_ORDER}" | jq .
