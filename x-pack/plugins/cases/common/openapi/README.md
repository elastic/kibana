# OpenAPI (Experimental)

The current self-contained spec file is [as JSON](https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/cases/common/openapi/bundled.json) or [as YAML](https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/cases/common/openapi/bundled.yaml) and can be used for online tools like those found at https://openapi.tools/. 
This spec is experimental and may be incomplete or change later.

A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).

## The `openapi` folder

* `entrypoint.yaml` is the overview file which pulls together all the paths and components.
* [Paths](paths/README.md): this defines each endpoint.  A path can have one operation per http method.
* [Components](components/README.md): Reusable components

## Tools

It is possible to validate the docs before bundling them with the following
command in the `x-pack/plugins/cases/common/openapi/` folder:

  ```
    npx swagger-cli validate x-pack/plugins/cases/common/openapi/entrypoint.yaml
  ```

Then you can generate the `bundled` files by running the following commands:

    ```
    npx @redocly/openapi-cli bundle --ext yaml --output bundled.yaml entrypoint.yaml
    npx @redocly/openapi-cli bundle --ext json --output bundled.json entrypoint.yaml
    ```

