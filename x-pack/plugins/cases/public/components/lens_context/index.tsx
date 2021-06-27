/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiMarkdownEditorUiPlugin } from '@elastic/eui';
import { Plugin } from 'unified';
import { TypedLensByValueInput } from '../../../../lens/public';

interface LensProcessingPluginRendererProps {
  attributes: TypedLensByValueInput['attributes'] | null;
  id?: string | null;
  title?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  viewMode?: boolean | undefined;
}

export interface CasesLensIntegration {
  editor_context: any;
  editor_plugins: {
    parsingPlugin: Plugin;
    processingPluginRenderer: React.FC<LensProcessingPluginRendererProps>;
    uiPlugin: EuiMarkdownEditorUiPlugin;
  };
}

// This context is available to all children of the stateful_event component where the provider is currently set
export const CasesLensIntegrationContext = React.createContext<CasesLensIntegration | null>(null);

export const CasesLensIntegrationProvider: React.FC<{
  lensIntegration?: CasesLensIntegration;
}> = ({ children, lensIntegration }) => {
  const [activeLensIntegration] = useState(lensIntegration ?? null);

  return (
    <CasesLensIntegrationContext.Provider value={activeLensIntegration}>
      {children}
    </CasesLensIntegrationContext.Provider>
  );
};
