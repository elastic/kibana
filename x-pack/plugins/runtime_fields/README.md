# Runtime fields

Welcome to the home of the runtime field editor and everything related to runtime fields!

## The runtime field editor

The runtime field editor is exported in 2 flavours:

* As the content of a `<EuiFlyout />`
* As a standalone component that you can inline anywhere

### Content of a `<EuiFlyout />`

```js
import React, { useState } from 'react';
import { EuiFlyoutBody, EuiButton } from '@elastic/eui';
import { RuntimeFieldEditorFlyout, RuntimeField } from '../runtime_fields/public';

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
          <RuntimeFieldEditorFlyout
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

#### With the `core.overlays.openFlyout`

As an alternative you can open the flyout with the `core.overlays.openFlyout`. In this case you will need to wrap the editor with the `Provider` from the "kibana_react" plugin as it is a required dependency for the `<CodeEditor />` component.

```js
import React, { useRef } from 'react';
import { EuiButton } from '@elastic/eui';
import { OverlayRef } from 'src/core/public';

import { createKibanaReactContext, toMountPoint } from '../../src/plugins/kibana_react/public';
import { RuntimeFieldEditorFlyout, RuntimeField } from '../runtime_fields/public';

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
          <RuntimeFieldEditorFlyout
            onSave={saveRuntimeField}
            onCancel={() => flyoutEditor.current?.close()}
            docLinks={{
              ELASTIC_WEBSITE_URL: 'https://elastic.co/',
              DOC_LINK_VERSION: 'master',
              links: {} as any,
            }}
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