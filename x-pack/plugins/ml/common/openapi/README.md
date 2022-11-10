# OpenAPI (Experimental)

The current self-contained spec file can be used for online tools like those found at https://openapi.tools/. This spec is experimental and may be incomplete or change later.

A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).

The `ml_apis_v2.json` file uses OpenAPI Specification Version 2.0.
The `ml_apis_v3.yaml` file uses OpenAPI Specification Version 3.0.1.

 ## Tools

It is possible to validate the docs before bundling them by running the following command in the `x-pack/plugins/ml/common/openapi/` folder:

```
npx swagger-cli validate ml_apis_v2.json
npx swagger-cli validate ml_apis_v3.yaml
```
