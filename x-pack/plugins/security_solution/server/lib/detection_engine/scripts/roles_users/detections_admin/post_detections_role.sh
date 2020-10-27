curl -H 'Content-Type: application/json' -H 'kbn-xsrf: 123'\
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
-XPUT ${KIBANA_URL}/api/security/role/detections_admin \
-d @detections_role.json
