curl -H 'Content-Type: application/json' -H 'kbn-xsrf: 123'\
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
-XPUT ${KIBANA_URL}/api/security/role/t2_analyst \
-d @detections_role.json
