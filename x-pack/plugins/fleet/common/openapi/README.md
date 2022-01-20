# OpenAPI (Experimental)

The current self-contained spec file is [as JSON](https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/fleet/common/openapi/bundled.json) or [as YAML](https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/fleet/common/openapi/bundled.yaml) and can be used for online tools like those found at https://openapi.tools/. This spec is experimental and may be incomplete or change later.

For example, online viewers for the specification like these:

| <a href="https://mrin9.github.io/OpenAPI-Viewer/#/load/https%3A%2F%2Fraw.githubusercontent.com%2Felastic%2Fkibana%2Fmaster%2Fx-pack%2Fplugins%2Ffleet%2Fcommon%2Fopenapi%2Fbundled.json">View spec using MrinDoc</a>  |  <a href="https://petstore.swagger.io/?url=https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/fleet/common/openapi/bundled.json">View spec using Swagger UI</a> |
|----|----|
| <img alt="Screen Shot 2021-03-09 at 10 14 52 AM" src="https://user-images.githubusercontent.com/57655/110493024-8944dd80-80c0-11eb-97b2-0666fcca3b09.png">  | <img alt="Screen Shot 2021-03-09 at 10 14 04 AM" src="https://user-images.githubusercontent.com/57655/110493019-88ac4700-80c0-11eb-982b-d5d352143003.png"> |

A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).
## The `openapi` folder

* `entrypoint.yaml` is the overview file which links to the various files on disk.
* `bundled.{yaml,json}` is the resolved output of that entry & other files in a single file. Typically the best choice as input to tools.
* [Paths](paths/README.md): this defines each endpoint.  A path can have one operation per http method.
* [Components](components/README.md): Reusable components like [`schemas`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject),
  [`responses`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responseObject)
  [`parameters`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterObject)

 ## Tools
It is possible to validate the docs before bundling them with the following command:
  ```
    npx swagger-cli validate x-pack/plugins/fleet/common/openapi/entrypoint.yaml
  ```

Then generate the `bundled` files with the following:

    ```
    npx @redocly/openapi-cli bundle --ext yaml --output bundled.yaml entrypoint.yaml
    npx @redocly/openapi-cli bundle --ext json --output bundled.json entrypoint.yaml
    ```
