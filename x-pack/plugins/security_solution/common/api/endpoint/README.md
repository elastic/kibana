## Elastic Defend related APIs developer reference


### Directory structure and files

- All the OpenAPI schemas are located under this directory and organized by sub-directories that reflect the API domain.
- Note that the sub-directory names for individual APIs are defined using snake_case to match the associated API path.
- The `model/` directory stores common schemas for re-use across multiple APIs. 

- Each API has at least the following set of files:
 
```
index.ts
<api_route_name>.ts
<api_route_name>.gen.ts
<api_route_name>.schema.yaml
```

#### `index.ts` file

The `index.ts` file found under each API directory exports both the generated and the kibana config schemas.


#### `<api_route_name>.ts` file

This file contains the Kibana `schema` definition that is used on the server side when the route is registered. This file is manually updated whenever needed.


#### `<api_route_name>.schema.yaml` file

This file defines and describes the API using the OpenAPI standard.


#### `<api_route_name>.gen.ts` file

This is a generated file and should not be updated manually. It contains schema validation code generated using the [Zod library](https://github.com/colinhacks/zod).





### Making changes

1. Update the OpenAPI schema YML file and/or the Kibana schema file (see References below for help with OpenAPI YAML format)
2. Generate/re-generate the Zod schema validation modules:
```shell
yarn --cwd x-pack/plugins/security_solution openapi:generate
```
3. Create a new bundle with the updated APIs:
```shell
yarn --cwd x-pack/plugins/security_solution openapi:bundle:endpoint-management
```
4. Ensure that the newly generated files are commited to source



### References

- [Kibana OpenAPI generator Usage Guide](https://github.com/elastic/kibana/blob/main/packages/kbn-openapi-generator/docs/USAGE_GUIDE.md)
- [Open API documentation](https://spec.openapis.org/oas/v3.0.3#document-structure)
- [Swagger documentation](https://swagger.io/docs/specification/basic-structure/)


