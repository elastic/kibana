curl -H 'Content-Type: application/json' -H 'kbn-xsrf: 123'\
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
-XGET ${KIBANA_URL}/api/security/role/soc_manager | jq -S .
