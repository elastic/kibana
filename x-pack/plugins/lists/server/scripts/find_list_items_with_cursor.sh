#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

LIST_ID=${1-list-ip}
PAGE=${2-1}
PER_PAGE=${3-20}
CURSOR=${4-invalid}

# Example:
#    ./find_list_items.sh 1 20 | jq .cursor
# Copy the cursor into the argument below like so
#    ./find_list_items_with_cursor.sh list-ip 1 10 eyJwYWdlX2luZGV4IjoyMCwic2VhcmNoX2FmdGVyIjpbIjAyZDZlNGY3LWUzMzAtNGZkYi1iNTY0LTEzZjNiOTk1MjRiYSJdfQ==
curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET "${KIBANA_URL}${SPACE_URL}/api/lists/items/_find?list_id=${LIST_ID}&page=${PAGE}&per_page=${PER_PAGE}&cursor=${CURSOR}" | jq .
