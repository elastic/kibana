curl -v -H 'Content-Type: application/json' -H 'kbn-xsrf: 123'\
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
-XPOST ${ELASTICSEARCH_URL}/_security/user/t1_analyst \
-d @server/lib/detection_engine/scripts/roles_users/t1_analyst/detections_user.json
