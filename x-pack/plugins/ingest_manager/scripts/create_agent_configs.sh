#!/usr/bin/env bash
curl --location --request POST 'localhost:5601/api/ingest_manager/agent_configs' \
--header 'Content-Type: application/json' \
--header 'kbn-xsrf: true' \
--header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
--data-raw '{"name":"NAME","description":"DESCRIPTION","namespace":"NAMESPACE"}'
