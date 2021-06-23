### Schema formatter 

In order to manage the size of the osquery schema files, there is a script
available to extract only the currently used fields (this selection is
currently manually curated). This assumes the targeted schema files will be in
`public/editor/osquery_schema`.

```
node scripts/schema_formatter --schema_version=v4.6.0
```
