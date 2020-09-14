## The `openapi` folder

 * `spec_entry.json` is the version which links to the various files on disk.
 * `spec_bundled.json` is the resolved output of that entry & other files in one file. It's currently generated with

    `npx swagger-cli bundle spec_entry.json -o spec_bundled.json`
 * [Paths](paths/README.md): this defines each endpoint.  A path can have one operation per http method.
* [Components](components/README.md): Reusable components like [`schemas`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject),
  [`responses`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responseObject)
  [`parameters`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterObject), etc
