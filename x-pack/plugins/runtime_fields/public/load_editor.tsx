/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreSetup, OverlayRef } from 'src/core/public';

import { toMountPoint, createKibanaReactContext } from './shared_imports';
import { LoadEditorResponse, RuntimeField } from './types';
import { RuntimeFieldEditorFlyoutContentProps } from './components';

export interface OpenRuntimeFieldEditorProps {
  onSave(field: RuntimeField): void;
  defaultValue?: RuntimeFieldEditorFlyoutContentProps['defaultValue'];
  ctx?: RuntimeFieldEditorFlyoutContentProps['ctx'];
}

export const getRuntimeFieldEditorLoader =
  (coreSetup: CoreSetup) => async (): Promise<LoadEditorResponse> => {
    const { RuntimeFieldEditorFlyoutContent } = await import('./components');
    const [core] = await coreSetup.getStartServices();
    const { uiSettings, theme, overlays, docLinks } = core;
    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({ uiSettings });

    let overlayRef: OverlayRef | null = null;

    const openEditor = ({ onSave, defaultValue, ctx }: OpenRuntimeFieldEditorProps) => {
      const closeEditor = () => {
        if (overlayRef) {
          overlayRef.close();
          overlayRef = null;
        }
      };

      const onSaveField = (field: RuntimeField) => {
        closeEditor();
        onSave(field);
      };

      overlayRef = overlays.openFlyout(
        toMountPoint(
          <KibanaReactContextProvider>
            <RuntimeFieldEditorFlyoutContent
              onSave={onSaveField}
              onCancel={() => overlayRef?.close()}
              docLinks={docLinks}
              defaultValue={defaultValue}
              ctx={ctx}
            />
          </KibanaReactContextProvider>,
          { theme$: theme.theme$ }
        )
      );

      return closeEditor;
    };

    return {
      openEditor,
    };
  };
