# OpenAPI (Experimental)

> **_NOTE:_** This spec is experimental and may be incomplete or change later.

The current self-contained spec file, available [as JSON](https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/fleet/common/openapi/bundled.json) or [as YAML](https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/fleet/common/openapi/bundled.yaml), can be used for online tools like those found at https://openapi.tools/.

For example, [click here to view the specification in the Swagger UI](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/fleet/common/openapi/bundled.json).

A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).

## The `openapi` folder

- `entrypoint.yaml` is the overview file which links to the various files on disk.
- `bundled.{yaml,json}` is the resolved output of that entry & other files in a single file. Typically the best choice as input to tools.
- [Paths](paths/README.md): this defines each endpoint. A path can have one operation per http method.
- [Components](components/README.md): Reusable components like [`schemas`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject),
  [`responses`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responseObject)
  [`parameters`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterObject)

## Tools

It is possible to validate the docs before bundling them with the following command:

```shell
$ npx @redocly/cli lint entrypoint.yaml
```

Then generate the `bundled` files with the following:

```shell
$ npx @redocly/openapi-cli bundle --ext yaml --output bundled.yaml entrypoint.yaml
$ npx @redocly/openapi-cli bundle --ext json --output bundled.json entrypoint.yaml
```

Validate the resulting bundle via

```shell
$ npx @redocly/cli lint bundled.json
```
