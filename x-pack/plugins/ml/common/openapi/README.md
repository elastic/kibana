# OpenAPI (Experimental)

The current self-contained spec file can be used for online tools like those found at https://openapi.tools/. This spec is experimental and may be incomplete or change later.

A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).

 ## Tools

It is possible to validate the docs before bundling them by running the following command in the `x-pack/plugins/ml/common/openapi/` folder:
  ```
    npx swagger-cli validate ml_apis.yaml
  ```

Then generate the `bundled` files with the following commands:

    ```
    npx @redocly/openapi-cli bundle --ext yaml --output bundled.yaml ml_apis.yaml
    npx @redocly/openapi-cli bundle --ext json --output bundled.json ml_apis.yaml
    ```

