# OpenAPI (Experimental)

The current self-contained spec file can be used for online tools like those found at https://openapi.tools/. This spec is experimental and may be incomplete or change later.

A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).

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
