#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# returns case data as { id, version }
# Example:
# ./generate_case_data.sh

set -e
  ./check_env_variables.sh
  ./post_case.sh | jq '{ id: .id, version: .version }';

