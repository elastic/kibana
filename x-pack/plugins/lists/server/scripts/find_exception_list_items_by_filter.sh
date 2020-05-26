#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

LIST_ID=${1:-endpoint_list}
FILTER=${2:-'exception-list.attributes.name:%20Sample%20Endpoint%20Exception%20List'}

# The %20 is just an encoded space that is typical of URL's.
# The %22 is just an encoded quote of "
# Table of them for testing if needed: https://www.w3schools.com/tags/ref_urlencode.asp

# Example: ./find_exception_list_items_by_filter.sh endpoint_list exception-list.attributes.name:%20Sample%20Endpoint%20Exception%20List
# Example: ./find_exception_list_items_by_filter.sh endpoint_list exception-list.attributes.entries.field:actingProcess.file.signer
curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET "${KIBANA_URL}${SPACE_URL}/api/exception_lists/items/_find?list_id=${LIST_ID}&filter=${FILTER}" | jq .
