# OpenAPI (Experimental)

The current self-contained spec file is [as YAML](https://raw.githubusercontent.com/elastic/kibana/master/x-pack/plugins/obserbability/docs/openapi/slo/bundled.yaml) and can be used for online tools like those found at <https://openapi.tools/>.
This spec is experimental and may be incomplete or change later.

A guide about the OpenApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).

## The `openapi/slo` folder

- `entrypoint.yaml` is the overview file which pulls together all the paths and components.
- [Paths](paths/README.md): this defines each endpoint. A path can have one operation per http method.
- [Components](components/README.md): Reusable components

## Tools

It is possible to manually validate the docs before bundling them with the following
command in the `x-pack/plugins/observability_solution/observability/docs/openapi/slo` folder:

```bash
make validate
```

Then you can generate the `bundled` files by running the following command- this target will automatically validate inputs and lint the result:

```bash
make bundle
```

To lint the generated bundle manually, run:

```bash
make lint
```
