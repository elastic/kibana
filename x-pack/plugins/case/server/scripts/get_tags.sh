#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

# Creates a new case and then gets it if no CASE_ID is specified

# Example:
# ./get_tags.sh


set -e
./check_env_variables.sh

curl -s -k \
-H 'Content-Type: application/json' \
-H 'kbn-xsrf: 123' \
-u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
-X GET "${KIBANA_URL}${SPACE_URL}/api/cases/tags" \
| jq .;
