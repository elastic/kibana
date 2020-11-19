#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

FILTER=${1:-'exception-list.attributes.name:%20Sample%20Endpoint%20Exception%20List'}
NAMESPACE_TYPE=${2-single}

# The %20 is just an encoded space that is typical of URL's.
# The %22 is just an encoded quote of "
# Table of them for testing if needed: https://www.w3schools.com/tags/ref_urlencode.asp

# Example get all lists by a particular name:
# ./find_exception_lists_by_filter.sh exception-list.attributes.name:%20Sample%20Endpoint%20Exception%20List
# ./find_exception_lists_by_filter.sh exception-list.attributes.tags:%20malware
# ./find_exception_lists_by_filter.sh exception-list.attributes.tags:%20malware single
# ./find_exception_lists_by_filter.sh exception-list.attributes.tags:%20malware agnostic
curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET "${KIBANA_URL}${SPACE_URL}/api/exception_lists/_find?filter=${FILTER}&namespace_type=${NAMESPACE_TYPE}" | jq .
