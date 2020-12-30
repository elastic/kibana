#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Uses a defaults if no argument is specified
LIST_ID=${1:-ip_list}
FILE=${2:-./lists/files/ips.txt}

# ./import_list_items.sh ip_list ./lists/files/ips.txt
curl -s -k \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/lists/items/_import?list_id=${LIST_ID}" \
  --form file=@${FILE} \
  | jq .;
