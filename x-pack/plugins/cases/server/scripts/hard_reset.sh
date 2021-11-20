#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# Deletes all current cases and comments and creates one new case with a comment
# Example:
# ./hard_reset.sh

set -e
./check_env_variables.sh
#
ALL_CASES=$(curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET "${KIBANA_URL}${SPACE_URL}/api/cases/_find?perPage=500" | jq '.cases' -j)

IDS=""
for row in $(echo "${ALL_CASES}" | jq -r '.[] | @base64'); do
    _jq() {
     echo ${row} | base64 --decode | jq -r ${1}
    }
   IDS+="$(_jq '.id') "
done

./generate_case_and_comment_data.sh
./delete_cases.sh $IDS
