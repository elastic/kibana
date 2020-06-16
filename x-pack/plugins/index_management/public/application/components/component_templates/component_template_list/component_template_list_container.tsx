/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ComponentTemplatesAuthProvider } from './auth_provider';
import { ComponentTemplatesWithPrivileges } from './with_privileges';
import { ComponentTemplateList } from './component_template_list';

export const ComponentTemplateListContainer: React.FunctionComponent = () => {
  return (
    <ComponentTemplatesAuthProvider>
      <ComponentTemplatesWithPrivileges>
        <ComponentTemplateList />
      </ComponentTemplatesWithPrivileges>
    </ComponentTemplatesAuthProvider>
  );
};
