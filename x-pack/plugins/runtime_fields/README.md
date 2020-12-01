# Runtime fields

Welcome to the home of the runtime field editor and everything related to runtime fields!

## The runtime field editor

### Integration

The recommended way to integrate the runtime fields editor is by adding a plugin dependency to the `"runtimeFields"` x-pack plugin. This way you will be able to lazy load the editor when it is required and it will not increment the bundle size of your plugin.

```js
// 1. Add the plugin as a dependency in your kibana.json
{
  ...
  "requiredBundles": [
    "runtimeFields",
    ...
  ]
}

// 2. Access it in your plugin setup()
export class MyPlugin {
  setup(core, { runtimeFields }) {
    // logic to provide it to your app, probably through context
  }
}

// 3. Load the editor and open it anywhere in your app
const MyComponent = () => {
  // Access the plugin through context
  const { runtimeFields } = useAppPlugins();

  // Ref of the handler to close the editor
  const closeRuntimeFieldEditor = useRef(() => {});

  const saveRuntimeField = (field: RuntimeField) => {
    // Do something with the field
    console.log(field); // { name: 'myField', type: 'boolean', script: "return 'hello'" }
  };

  const openRuntimeFieldsEditor = async() => {
    // Lazy load the editor
    const { openEditor } = await runtimeFields.loadEditor();

    closeRuntimeFieldEditor.current = openEditor({
      onSave: saveRuntimeField,
      /* defaultValue: optional field to edit */
    });
  };

  useEffect(() => {
    return () => {
      // Make sure to remove the editor when the component unmounts
      closeRuntimeFieldEditor.current();
    };
  }, []);

  return (
    <button onClick={openRuntimeFieldsEditor}>Add field</button>
  )
}
```

#### Alternative

The runtime field editor is also exported as static React component that you can import into your components. The editor is exported in 2 flavours:

* As the content of a `<EuiFlyout />` (it contains a flyout header and footer)
* As a standalone component that you can inline anywhere

**Note:** The runtime field editor uses the `<CodeEditor />` that has a dependency on the `Provider` from the `"kibana_react"` plugin. If your app is not already wrapped by this provider you will need to add it at least around the runtime field editor. You can see an example in the ["Using the core.overlays.openFlyout()"](#using-the-coreoverlaysopenflyout) example below.

### Content of a `<EuiFlyout />`

```js
import React, { useState } from 'react';
import { EuiFlyoutBody, EuiButton } from '@elastic/eui';
import { RuntimeFieldEditorFlyoutContent, RuntimeField } from '../runtime_fields/public';

const MyComponent = () => {
  const { docLinksStart } = useCoreContext(); // access the core start service
  const [isFlyoutVisilbe, setIsFlyoutVisible] = useState(false);
 
  const saveRuntimeField = useCallback((field: RuntimeField) => {
    // Do something with the field
  }, []);

  return (
    <>
      <EuiButton onClick={() => setIsFlyoutVisible(true)}>Create field</EuiButton>

      {isFlyoutVisible && (
        <EuiFlyout onClose={() => setIsFlyoutVisible(false)}>
          <RuntimeFieldEditorFlyoutContent
            onSave={saveRuntimeField}
            onCancel={() => setIsFlyoutVisible(false)}
            docLinks={docLinksStart}
            defaultValue={/*optional runtime field to edit*/}
          />
        </EuiFlyout>
      )}
    </>
  ) 
}
```

#### Using the `core.overlays.openFlyout()`

As an alternative you can open the flyout with the `openFlyout()` helper from core.

```js
import React, { useRef } from 'react';
import { EuiButton } from '@elastic/eui';
import { OverlayRef } from 'src/core/public';

import { createKibanaReactContext, toMountPoint } from '../../src/plugins/kibana_react/public';
import { RuntimeFieldEditorFlyoutContent, RuntimeField } from '../runtime_fields/public';

const MyComponent = () => {
  // Access the core start service
  const { docLinksStart, overlays, uiSettings } = useCoreContext();
  const flyoutEditor = useRef<OverlayRef | null>(null);

  const { openFlyout } = overlays;
 
  const saveRuntimeField = useCallback((field: RuntimeField) => {
    // Do something with the field
  }, []);

  const openRuntimeFieldEditor = useCallback(() => {
    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({ uiSettings });

    flyoutEditor.current = openFlyout(
      toMountPoint(
        <KibanaReactContextProvider>
          <RuntimeFieldEditorFlyoutContent
            onSave={saveRuntimeField}
            onCancel={() => flyoutEditor.current?.close()}
            docLinks={docLinksStart}
            defaultValue={defaultRuntimeField}
          />
        </KibanaReactContextProvider>
      )
    );
  }, [openFlyout, saveRuntimeField, uiSettings]);

  return (
    <>
      <EuiButton onClick={openRuntimeFieldEditor}>Create field</EuiButton>
    </>
  ) 
}
```

### Standalone component

```js
import React, { useState } from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { RuntimeFieldEditor, RuntimeField, RuntimeFieldFormState } from '../runtime_fields/public';

const MyComponent = () => {
  const { docLinksStart } = useCoreContext(); // access the core start service
  const [runtimeFieldFormState, setRuntimeFieldFormState] = useState<RuntimeFieldFormState>({
    isSubmitted: false,
    isValid: undefined,
    submit: async() => Promise.resolve({ isValid: false, data: {} as RuntimeField })
  });

  const { submit, isValid: isFormValid, isSubmitted } = runtimeFieldFormState;
 
  const saveRuntimeField = useCallback(async () => {
    const { isValid, data } = await submit();
    if (isValid) {
      // Do something with the field (data)
    }
  }, [submit]);

  return (
    <>
      <RuntimeFieldEditor
        onChange={setRuntimeFieldFormState}
        docLinks={docLinksStart}
        defaultValue={/*optional runtime field to edit*/}
      />

      <EuiSpacer />

      <EuiButton
        onClick={saveRuntimeField}
        disabled={isSubmitted && !isFormValid}>
        Save field
      </EuiButton>
    </>
  ) 
}
```