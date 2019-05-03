/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';

import { EditorFrameInstance } from '../types';
import { NativeRenderer } from '../native_renderer';

export function App({ editorFrame }: { editorFrame: EditorFrameInstance }) {
  return (
    <I18nProvider>
      <div>
        <h1>Lens</h1>

        <NativeRenderer render={editorFrame.mount} nativeProps={undefined} />
      </div>
    </I18nProvider>
  );
}
