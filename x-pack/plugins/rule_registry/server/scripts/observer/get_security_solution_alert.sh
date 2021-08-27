#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e

cd ./hunter && sh ./post_detections_role.sh && sh ./post_detections_user.sh
cd ../observer && sh ./post_detections_role.sh && sh ./post_detections_user.sh
cd ..


USER=${1:-'hunter'}

# Example: ./find_rules.sh
curl -s -k \
 -u $USER:changeme \
 -X GET ${KIBANA_URL}${SPACE_URL}/security-myfakepath | jq .
