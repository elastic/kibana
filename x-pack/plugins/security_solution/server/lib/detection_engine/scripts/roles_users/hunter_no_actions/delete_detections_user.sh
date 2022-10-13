
#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

curl -v -H 'Content-Type: application/json' -H 'kbn-xsrf: 123'\
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
-XDELETE ${ELASTICSEARCH_URL}/_security/user/hunter_no_actions
