# OpenAPI

There is a new way to generate openapi docs from the route definition in code.

When adding a new route/modifying request/response parameters, make sure to add/update schema definitions when registering the route.
[Example](https://github.com/elastic/kibana/blob/5ea1ab0b8a21764aa54a5ef9650a0d8046f3f0a8/x-pack/plugins/fleet/server/routes/agent/index.ts#L96-L123)

Read more: https://docs.elastic.dev/kibana-dev-docs/genereating-oas-for-http-apis 

To update the generated openapi bundle, run this script:

```
node scripts/capture_oas_snapshot --update
```

Use `--include-path /api/fleet` to only generate fleet paths.

Use `--no-serverless` to only generate for stateful.

Make sure to commit the changes to the bundles (don't override non-Fleet paths).

Check the result in `oas_docs/bundle.json` and `oas_docs/bundle.serverless.json`

Check the result in Swagger UI here: https://petstore.swagger.io/?url=https://raw.githubusercontent.com/elastic/kibana/main/oas_docs/bundle.json

