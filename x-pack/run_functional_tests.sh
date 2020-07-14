export TEST_KIBANA_URL="http://elastic:mlqa_admin@localhost:5601"
export TEST_ES_URL="http://elastic:mlqa_admin@localhost:9200"
node ../scripts/functional_test_runner --include-tag walterra
