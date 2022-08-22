/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, VFC } from 'react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import { SecuritySolutionContext } from '../../containers/security_solution_context';
import { getSecuritySolutionContextMock } from './mock_security_context';

export interface KibanaContextMock {
  /**
   * For the data plugin (see {@link DataPublicPluginStart})
   */
  data?: DataPublicPluginStart;
  /**
   * For the core ui-settings package (see {@link IUiSettingsClient})
   */
  uiSettings?: IUiSettingsClient;
}

export interface StoryProvidersComponentProps {
  /**
   * Used to generate a new KibanaReactContext (using {@link createKibanaReactContext})
   */
  kibana: KibanaContextMock;
  /**
   * Component(s) to be displayed inside
   */
  children: ReactNode;
}

/**
 * Helper functional component used in Storybook stories.
 * Wraps the story with our {@link SecuritySolutionContext} and KibanaReactContext.
 */
export const StoryProvidersComponent: VFC<StoryProvidersComponentProps> = ({
  children,
  kibana,
}) => {
  const KibanaReactContext = createKibanaReactContext(kibana as CoreStart);
  const securitySolutionContextMock = getSecuritySolutionContextMock();

  return (
    <SecuritySolutionContext.Provider value={securitySolutionContextMock}>
      <KibanaReactContext.Provider>{children}</KibanaReactContext.Provider>
    </SecuritySolutionContext.Provider>
  );
};
