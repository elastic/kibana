# APM app OpenAPI documentation

This directory contains [OpenAPI specifications](https://swagger.io/specification/) for the [APM app API](https://www.elastic.co/guide/en/kibana/current/apm-api.html) in Kibana.

# OpenAPI (Experimental)

The current self-contained spec file is available as `bundled.json` or `bundled.yaml` and can be used for online tools like those found at <https://openapi.tools/>.
This spec is experimental and may be incomplete or change later.

A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).

## The `openapi` folder

* `entrypoint.yaml` is the overview file which pulls together all the paths and components.
* [Paths](paths/README.md): Defines each endpoint.  A path can have one operation per http method.
* [Components](components/README.md): Defines reusable components.

## Tools

Generate the `bundled` files by running the following commands:

```bash
npx @redocly/cli bundle entrypoint.yaml --output bundled.yaml --ext yaml
npx @redocly/cli bundle entrypoint.yaml --output bundled.json --ext json
```

Then join these files with the rest of the Kibana APIs per `oas_docs/README.md`
