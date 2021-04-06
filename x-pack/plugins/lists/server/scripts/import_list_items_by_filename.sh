#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Uses a defaults if no argument is specified
TYPE=${1:-ip}
FILE=${2:-./lists/files/ips.txt}

# Example to import ips from ./lists/files/ips.txt
# ./import_list_items_by_filename.sh ip ./lists/files/ips.txt

curl -s -k \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/lists/items/_import?type=${TYPE}" \
  --form file=@${FILE} \
  | jq .;
