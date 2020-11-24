# End-To-End (e2e) Test for APM UI

**Run E2E tests**


```sh
# In one terminal
node ./scripts/kibana --no-base-path --dev --no-dev-config --config x-pack/plugins/apm/e2e/ci/kibana.e2e.yml
# In another terminal
x-pack/plugins/apm/e2e/run-e2e.sh
```

Starts kibana, APM Server, Elasticsearch (with sample data) and runs the tests.

If you see errors about not all events being ingested correctly try running `cd kibana/x-pack/plugins/apm/e2e/tmp/apm-integration-testing && docker-compose down -v`
