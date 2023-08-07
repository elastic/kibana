# Kibana Reporting

An awesome Kibana reporting plugin

## csv_searchsource. 
This is the endpoint used in the Discover UI. It must be replaced by csv_v2 at some point, when we have more capacity in reporting. https://github.com/elastic/kibana/issues/151190
## csv_searchsource_immediate. 
This should be deprecated. It is historically a customer driven endpoint.  This will be replaced in the UI with an async export option in the future. 
## csv_v2. 
This new endpoint is designed to have a more automation-friendly signature. It will replace csv_searchsource in the UI at some point, when there is more capacity in reporting. It will need a little more work to have parity: it needs to be able to export "unsaved" searches.

## Generate CSV
Although historically related to reporting, the CsvGenerator class has now be moved into its own package `@kbn/generate-csv` and `@kbn/generate-csv-types`. 

## Serverless configuration
There are several improvements made for reporting in serverless environments. Most changes are reflected in `reporting/server/config/schema.ts` for reference. 

PNG and PDF reports are not possible in serverless. CSV reporting is enabled by default but can be set to `xpack.reporting.export_types.csv.enabled: false`. Image reporting will not be registered by the export types registry in the reporting plugin if not enabled in the config.

The deprecated setting `xpack.reporting.roles.enabled` is false by default for serverless. 
