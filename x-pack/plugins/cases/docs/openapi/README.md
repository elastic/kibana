# OpenAPI (Experimental)

The current self-contained spec file is [as JSON](https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/cases/common/openapi/bundled.json) or [as YAML](https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/cases/common/openapi/bundled.yaml) and can be used for online tools like those found at <https://openapi.tools/>.
This spec is experimental and may be incomplete or change later.

A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).

## The `openapi` folder

* `entrypoint.yaml` is the overview file which pulls together all the paths and components.
* [Paths](paths/README.md): this defines each endpoint.  A path can have one operation per http method.
* [Components](components/README.md): Reusable components

## Tools

Generate the `bundled` files by running the following commands:

  ```bash
    npx @redocly/cli bundle entrypoint.yaml --output bundled.yaml --ext yaml
    npx @redocly/cli bundle entrypoint.yaml --output bundled.json --ext json
  ```

Then join these files with the rest of the Kibana APIs per `oas_docs/README.md`
