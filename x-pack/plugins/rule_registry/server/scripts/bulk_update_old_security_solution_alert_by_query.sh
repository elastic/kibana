#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e

QUERY=${1:-"signal.status: open"}
STATUS=${2}

echo $IDS
echo "'"$STATUS"'"

cd ./hunter && sh ./post_detections_role.sh && sh ./post_detections_user.sh
cd ../observer && sh ./post_detections_role.sh && sh ./post_detections_user.sh
cd ..

# Example: ./update_observability_alert.sh "kibana.rac.alert.stats: open" <closed | open>
curl -v \
 -H 'Content-Type: application/json' \
 -H 'kbn-xsrf: 123' \
 -u hunter:changeme \
 -X POST ${KIBANA_URL}/internal/rac/alerts/bulk_update \
-d "{\"ids\": [\"cf2b7bf9b224c5ca9b4080ebf7a0ee0e1556898633cca169913482f5664a8a04\"], \"status\":\"open\", \"index\":\".siem-signals*\"}" 
