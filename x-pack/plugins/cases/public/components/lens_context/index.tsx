/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiMarkdownEditorUiPlugin, EuiMarkdownAstNodePosition } from '@elastic/eui';
import { Plugin } from 'unified';

interface LensProcessingPluginRendererProps {
  id: string | null;
  title: string;
  graphEventId?: string;
  type: 'lens';
  [key: string]: string | null | undefined;
}

export interface CasesLensIntegration {
  editor_plugins: {
    parsingPlugin: Plugin;
    processingPluginRenderer: React.FC<
      LensProcessingPluginRendererProps & { position: EuiMarkdownAstNodePosition }
    >;
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
