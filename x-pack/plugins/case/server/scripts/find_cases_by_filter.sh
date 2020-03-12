#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

FILTER=${1:-'cases.attributes.state:%20closed'}

# The %20 is just an encoded space that is typical of URL's.
# The %22 is just an encoded quote of "
# Table of them for testing if needed: https://www.w3schools.com/tags/ref_urlencode.asp

# Example get all open cases:
# ./find_cases_by_filter.sh "cases.attributes.state:%20open"

# Example get all the names that start with Bad*
# ./find_cases_by_filter.sh "cases.attributes.title:%20Bad*"

# Exampe get everything that has phishing
# ./find_cases_by_filter.sh "cases.attributes.tags:phishing"

curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET ${KIBANA_URL}${SPACE_URL}/api/cases/_find?filter=$FILTER | jq .
