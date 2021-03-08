## The `openapi` folder

* `entrypoint.yaml` is the overview file which links to the various files on disk.
* `bundled.{yaml,json}` is the resolved output of that entry & other files in a single file. It's currently generated with:

    ```
    npx swagger-cli bundle -o bundled.json -t json entrypoint.yaml
    npx swagger-cli bundle -o bundled.yaml -t yaml entrypoint.yaml
    ```
* [Paths](paths/README.md): this defines each endpoint.  A path can have one operation per http method.
* [Components](components/README.md): Reusable components like [`schemas`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject),
  [`responses`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responseObject)
  [`parameters`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterObject), etc
  