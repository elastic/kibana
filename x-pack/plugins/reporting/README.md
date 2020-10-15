# Kibana Reporting

An awesome Kibana reporting plugin

# Development

Assuming you've checked out x-plugins next to kibana...

- Run `yarn kbn bootstrap`
- Run `yarn start` to watch for and sync files on change
- Open a new terminal to run Kibana - use `yarn start` to launch it in dev mode
  - Kibana will automatically restart as files are synced
  - If you need debugging output, run `DEBUG=reporting yarn start` instead

If you have installed this somewhere other than via x-plugins, and next to the kibana repo, you'll need to change the `pathToKibana` setting in `gulpfile.js`

# Conventions

This plugins adopts some conventions in addition to or in place of conventions in Kibana (at the time of the plugin's creation):

## Folder structure
```
export_types/ (contains public and server aspects of the different export types) 
  printable_pdf/ 
    public/
    server/
  csv/
    public/
    server/
public/ (shared public code for all export types)
server/ (shared server code for all export types)
```

This folder structure treats the different export_types like Plugins, with their public/server code being separate in a folder.