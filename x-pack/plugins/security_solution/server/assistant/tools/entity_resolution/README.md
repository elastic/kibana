## Entity Resolution PoC Setup

This will guide you to get the entity resolution PoC running with our demo data set.

![PoC Image](./readme_images/poc.png)

### Prerequisites
- [kibana](https://github.com/elastic/kibana) repository is cloned locally
- [security-documents-generator](https://github.com/elastic/security-documents-generator) repository cloned locally
- this guide uses the [Github CLI](https://cli.github.com/) command line tool to easily checkout pull requests locally
- An Kibana AI connector configuration to use

### Instructions
- 1. In the kibana repo, clone the [PoC branch](https://github.com/elastic/kibana/pull/188647) using `gh pr checkout 188647`
- 2. Start Elasticsearch & Kibana locally from the kibana repo:
    - `yarn es snapshot --license trial`
    - in separate terminal `yarn start`
- 3. Configure the security-documents-generator
    - From the security-documents-generator repo, checkout the [PR branch](https://github.com/elastic/security-documents-generator/pull/17) `gh pr checkout 17` 
    - run `yarn`
    - Modify `config.dev.json` to have the correct Kibana credentials and URL (for example if you use a custom base URL you will need to add this to the config)
- 4. Run the security documents generator. By default the generator loads @jmcarlock's test data set of System logs, EntraID integration, Okta Entity Analytics integration and Okta integration data. We also have a "mini" data set of one entity for small tests. From the security-documents-generator repo run one of the following:
    - `yarn start entity-resolution-demo` - load the full data set
    - `yarn start entity-resolution-demo --mini` - load 4 "Mark Hopkin" records to get started
    - Some other useful flags `--delete` deletes all existing data before loading the data again, `--keep-emails` keeps the emails as they were in Gus's dataset, otherwise we add some variation by shortening first name, last name, or omitting last name in some records, to make the datsa more varied.
- 5. Once the generator is complete, it logs a link to the entity analytics management page where you can install the model using the button in the top right corner:

![PoC Image](./readme_images/generator_output.png)

![PoC Image](./readme_images/initialize_model.png)
- 6. After the model is installed, it may take a minute for data to appear, we can check the entity store index to verify how muc hdata is loaded:
    - In dev tools run: 
    
```
GET .entities.v1.latest.secsol-ea-entity-store/_search?size=100
{
  "_source": {
    "excludes": ["test_user_name_embeddings"],
    "includes": ["user.email", "user.name","sourceIndex"]
  }
}
```

- 7. Entity resolution demo is now set up, go to the security users dashboard, or the alerts page to click on a user name and open the entity flyout and test the feature. 

### Using the API

To use the API you can run:

```sh
curl 'http://elastic:changeme@localhost:5601/mark/internal/elastic_assistant/entity_resolution' \
    -H 'kbn-xsrf: true' \
    -H 'Content-Type: application/json;charset=UTF-8' \
    -H 'elastic-api-version: 1' \
    --data-binary $'{ "entitiesIndexPattern": ".entities.v1.latest.secsol-ea-entity-store", "entity" : { "type" : "user", "name": "Mark Hopkin" }, "size": 20, "replacements": {}, "subAction": "invokeAI", "apiConfig": { "connectorId": "9f991efc-e1b8-47be-b2e0-efb1d3eb4272", "actionTypeId": ".bedrock", "model": "anthropic.claude-3-5-sonnet-20240620-v1:0"}, "promptTemplate": "Does $$ENTITY mactch one of $$CANDIDATES" }
' 
```

Easiest way to get the API config is by copying the entity resolution network request as curl in dev tools. `promptTemplate` is not required it is just for testing. The full API docs can be found in `x-pack/packages/kbn-elastic-assistant-common/impl/schemas/entity_resolution/post_entity_resolution_route.schema.yaml`

NOTE: the prompt is only half of the text sent to the LLM, the output parser specifies the confidence level, reason fields etc, this can be found in `x-pack/plugins/security_solution/server/assistant/tools/entity_resolution/get_entity_resolution_output_parser.ts` The prompt and the output format are combined in `x-pack/plugins/security_solution/server/assistant/tools/entity_resolution/entity_resolution_tool.ts`. 

To see where the vector search occurs, see `x-pack/plugins/elastic_assistant/server/ai_assistant_data_clients/entity_resolution/entity_resolution_data_client.ts` Note that we set a min score of 0.92.