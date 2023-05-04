### Schema formatter 

In order to manage the size of the osquery schema files, there is a script
available to extract only the currently used fields (this selection is
currently manually curated). This assumes the targeted schema files will be in
`public/editor/osquery_schema`.

```
node ecs.js --schema_version=4.6.0                  // (filename without .json extension)
Possibly it's going to be necessary to transform fields' names into lower case, because CSV exports Fields with Capital Letters. 

node osquery.js --schema_version=4.6.0              // (filename without .json extension)
```
