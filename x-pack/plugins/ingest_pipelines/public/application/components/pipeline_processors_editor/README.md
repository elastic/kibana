# Pipeline Processors Editor

This component provides a way to visually build and manage an ingest
pipeline.

# API

## Editor components

The top-level API consists of 3 pieces that enable the maximum amount
of flexibility for consuming code to determine overall layout.

- PipelineProcessorsEditorContext
- ProcessorsEditor
- GlobalOnFailureProcessorsEditor

The editor components must be wrapped inside of the context component
as this is where the shared processors state is contained.

## Load JSON button

This component is totally standalone. It gives users a button that
presents a modal for loading a pipeline. It does some basic
validation on the JSON to ensure that it is correct.
