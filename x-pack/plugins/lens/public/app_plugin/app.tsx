/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React, { useCallback } from 'react';

import { EditorFrameSetup } from '../types';

export function App({ editorFrame }: { editorFrame: EditorFrameSetup }) {
  const renderFrame = useCallback(node => {
    if (node !== null) {
      editorFrame.render(node);
    }
  }, []);

  return (
    <I18nProvider>
      <div>
        <h1>Lens</h1>

        <div ref={renderFrame} />
      </div>
    </I18nProvider>
  );
}
