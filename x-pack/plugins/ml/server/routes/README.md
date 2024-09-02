# ML Kibana API routes

This folder contains ML API routes in Kibana.

For better API documentation, each route handler needs a `summary` and `description`. Kibana schema definitions, which are used to validate requests and responses, also appear in the documentation. To improve the documentation's clarity, it's important to include a detailed `description` for each property in these schema definitions as well.

To generate an OpenAPI spec file, make sure the OAS Kibana endpoint is enabled in `kibana.dev.yml`

```yaml
server.oas.enabled: true
```

And after starting Kibana `yarn start --no-base-path`, call the `oas` endpoint and output to a file, e.g. 

```bash
curl -s -u <USERNAME>:<PASSWORD> http://localhost:5601/api/oas\?pathStartsWith\=/internal/ml\&access\=internal -o ml_kibana_openapi.json
```
