USER=(${@:-./detections_user.json})


curl -v -H 'Content-Type: application/json' -H 'kbn-xsrf: 123'\
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
-XPOST ${ELASTICSEARCH_URL}/_security/user/platform_engineer \
-d @${USER}
