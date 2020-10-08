#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

NAMESPACE_TYPE=${2-single}

# Example: ./delete_exception_list_by_id.sh ${list_id}
# Example: ./delete_exception_list_by_id.sh ${list_id} single
# Example: ./delete_exception_list_by_id.sh ${list_id} agnostic
curl -s -k \
 -H 'kbn-xsrf: 123' \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X DELETE "${KIBANA_URL}${SPACE_URL}/api/exception_lists?id=$1&namespace_type=${NAMESPACE_TYPE}" | jq .
