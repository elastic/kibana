/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { AuthorizationProvider } from '../shared_imports';
import { useComponentTemplatesContext } from '../component_templates_context';

export const ComponentTemplatesAuthProvider: React.FunctionComponent = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const { httpClient, apiBasePath } = useComponentTemplatesContext();

  return (
    <AuthorizationProvider
      privilegesEndpoint={`${apiBasePath}/component_templates/privileges`}
      httpClient={httpClient}
    >
      {children}
    </AuthorizationProvider>
  );
};
