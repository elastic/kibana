#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

NAMESPACE_TYPE=${2-single}

# Example: ./get_exception_list.sh {id} single
# Example: ./get_exception_list.sh {id} agnostic
curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET "${KIBANA_URL}${SPACE_URL}/api/exception_lists?list_id=$1&namespace_type=${NAMESPACE_TYPE}" | jq .
