# ML Kibana API routes

This folder contains ML API routes in Kibana.

Each route handler requires `summary` and `description` properties for API documentation. Schemas for validation are also used to 

To generate an OpenAPI spec file, make sure the OAS Kibana endpoint is enabled in `kibana.dev.yml`

```yaml
server.oas.enabled: true
```

And after starting Kibana `yarn start --no-base-path`, call the `oas` endpoint and output to a file, e.g. 

```bash
curl -s -u <USERNAME>:<PASSWORD> http://localhost:5601/api/oas\?pathStartsWith\=/internal/ml\&access\=internal -o ml_kibana_openapi.json
```
