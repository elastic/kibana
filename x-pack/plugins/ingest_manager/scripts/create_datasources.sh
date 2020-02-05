#!/usr/bin/env bash
curl --location --request POST 'localhost:5601/api/ingest_manager/datasources' \
--header 'Content-Type: application/json' \
--header 'kbn-xsrf: xxx' \
--header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
--data-raw '{"name":"name string","agent_config_id":"some id string","package":{"name":"endpoint","version":"1.0.1","description":"Description about Endpoint package","title":"Endpoint Security","assets":[{"id":"string","type":"index-template"}]},"streams":[{"input":{"type":"etc","config":{"paths":"/var/log/*.log"},"ingest_pipelines":["string"],"index_template":"string","ilm_policy":"string","fields":[{}]},"config":{"metricsets":["container","cpu"]},"output_id":"default","processors":["string"]}],"read_alias":"string"}'
