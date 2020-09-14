## The `openapi` folder

This folder contains your entrypoint `openapi.yaml`.

That file contains references to the entire API definition.

Here are some sections to pay attention to:

* Top-level **description**: this accepts markdown, and Redoc and Redocly API Reference will render it at the top of the docs.  Consider maintaining your markdown in a separate file and [embedding it](https://redoc.ly/docs/api-reference-docs/embedded-markdown/). Note to Redoc community edition users, the special tags are only available to the Redocly API Reference users, but you can still embed markdown.
* Security schemes: you will define the scheme(s) your API uses for security (eg OAuth2, API Key, etc...). The security schemes are used by the Redocly API Reference "Try It" API console feature.
* [Paths](paths/README.md): this defines each endpoint.  A path can have one operation per http method.
* Tags: it's a good idea to organize each operation.  Each tag can have a description.  The description is used as a section description within the reference docs.
* Servers: a list of your servers, each with a URL.