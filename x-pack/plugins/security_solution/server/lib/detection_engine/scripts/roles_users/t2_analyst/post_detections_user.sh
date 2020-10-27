curl -v -H 'Content-Type: application/json' -H 'kbn-xsrf: 123'\
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
-XPOST ${ELASTICSEARCH_URL}/_security/user/t2_analyst \
-d @detections_user.json
