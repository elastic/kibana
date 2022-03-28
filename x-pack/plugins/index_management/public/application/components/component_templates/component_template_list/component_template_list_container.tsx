/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { useExecutionContext } from '../shared_imports';
import { useComponentTemplatesContext } from '../component_templates_context';
import { ComponentTemplatesAuthProvider } from './auth_provider';
import { ComponentTemplatesWithPrivileges } from './with_privileges';
import { ComponentTemplateList } from './component_template_list';

interface MatchParams {
  componentTemplateName?: string;
}

export const ComponentTemplateListContainer: React.FunctionComponent<
  RouteComponentProps<MatchParams>
> = ({
  match: {
    params: { componentTemplateName },
  },
  history,
}) => {
  const { executionContext } = useComponentTemplatesContext();

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'indexManagementComponentTemplates',
  });

  return (
    <ComponentTemplatesAuthProvider>
      <ComponentTemplatesWithPrivileges>
        <ComponentTemplateList componentTemplateName={componentTemplateName} history={history} />
      </ComponentTemplatesWithPrivileges>
    </ComponentTemplatesAuthProvider>
  );
};
