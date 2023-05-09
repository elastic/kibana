## Summary

There are three constructs that interact: the `ReportingPlugin`, the `ExportTypesPlugin` and the `ExportTypesRegistry`.

`ReportingExportTypesPlugin` on setup() creates the  `export_type_definitions`. The export type definitions can be one of the following:
- CSVExportTypeDefinition
- PNGExportTypeDefinition
- PDFExportTypeDefinition

The `ReportingPlugin` creates an instance of the `ExportTypeRegistry` and exposes its `registerExportType()` to other plugins, which `ReportingExportTypesPlugin` uses to register all of the export types. The `ReportingPlugin` uses the getExportType() method to use the registered export types for exporting.

### Problems this solves

The `ExportTypesPlugin` allows reporting to create its `ExportTypeRegistry`. This registry can be referenced in UI facing points of reporting can be enabled or disabled. 