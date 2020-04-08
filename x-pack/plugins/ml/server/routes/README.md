# ML Kibana API routes

This folder contains ML API routes in Kibana.

Each route handler requires [apiDoc](https://github.com/apidoc/apidoc) annotations in order 
to generate documentation.
The [apidoc-markdown](https://github.com/rigwild/apidoc-markdown) package is also required in order to generate the markdown.

There are custom parser and worker (`x-pack/plugins/ml/server/routes/apidoc_scripts`) to process api schemas for each documentation entry. It's written with typescript so make sure all the scripts in the folder are compiled before executing `apidoc` command.

For now the process is pretty manual. You need to make sure the latest versions of the packages mentioned above are installed globally 
to execute the following command from the directory in which this README file is located.
```
cd apidoc_scripts && tsc && cd .. && apidoc --parse-workers apischema=apidoc_scripts/target/schema_worker.js --parse-parsers apischema=apidoc_scripts/target/schema_parser.js  -i . -o ../routes_doc && apidoc-markdown -p ../routes_doc -o ../routes_doc/ML_API.md
```
It compiles all the required scripts and generates the documentation both in HTML and Markdown formats.


It will create a new directory `routes_doc` (next to the `routes` folder) which contains the documentation in HTML format 
as well as `ML_API.md` file.
