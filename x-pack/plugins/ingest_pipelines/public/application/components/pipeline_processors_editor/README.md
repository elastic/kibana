# Pipeline Processors Editor

This component provides a way to visually build and manage an ingest
pipeline.

# API

## Editor components

The top-level API consists of two pieces:

- ProcessorsEditorContextProvider
- PipelineProcessorsEditor

The editor component must be wrapped inside of the context component
as this is where the shared processors state is contained.

Example usage from the [PipelineFormFields](../pipeline_form/pipeline_form_fields.tsx) component:

```
<ProcessorsEditorContextProvider
  onFlyoutOpen={onEditorFlyoutOpen}
  onUpdate={onProcessorsUpdate}
  value={{ processors, onFailure }}
>
  <PipelineProcessorsEditor onLoadJson={onLoadJson} />
</ProcessorsEditorContextProvider>
```

The editor has a dependency on `KibanaContextProvider`, which is defined in the main app's `index.tsx` file. Note that the editor also relies on imports from `public/shared_imports.ts` and `common/types.ts`.

### ProcessorsEditorContextProvider
This component manages state for the processors, as well as state for the test pipeline functionality.

### PipelineProcessorsEditor
This component is responsible for building the layout of the processors editor.

It contains the processor and on-failure processor editors. It also includes the following capabilities that are rendered within the processors header:

- **Load JSON button:** This component gives users a button that
presents a modal for loading a pipeline. It does some basic
validation on the JSON to ensure that it is correct.
- **Test pipeline actions:** This component presents users with a toolbar to test a pipeline. It includes a flyout where users can add sample documents. It issues a request to simulate the pipeline and displays the output. Once the request is successful, a user can use the documents dropdown to view the results for a particular document.
