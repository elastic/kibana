# Transform Kibana API routes

This folder contains Transform API routes in Kibana.

Each route handler requires [apiDoc](https://github.com/apidoc/apidoc) annotations in order
to generate documentation.
The [apidoc-markdown](https://github.com/rigwild/apidoc-markdown) package is also required in order to generate the markdown.

There are custom parser and worker (`x-pack/plugins/transform/server/routes/apidoc_scripts`) to process api schemas for each documentation entry. It's written with typescript so make sure all the scripts in the folder are compiled before executing `apidoc` command.

Make sure you have run `yarn kbn bootstrap` to get all requires dev dependencies. Then execute the following command from the transform plugin folder:
```
yarn run apiDocs
```
It compiles all the required scripts and generates the documentation both in HTML and Markdown formats.


It will create a new directory `routes_doc` (next to the `routes` folder) which contains the documentation in HTML format
as well as `Transform_API.md` file.
