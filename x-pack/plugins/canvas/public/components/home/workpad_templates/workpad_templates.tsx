/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { useCreateFromTemplate, useFindTemplatesOnMount } from '../hooks';

import { WorkpadTemplates as Component } from './workpad_templates.component';

export const WorkpadTemplates = () => {
  const [isMounted, templateResponse] = useFindTemplatesOnMount();
  const onCreateWorkpad = useCreateFromTemplate();

  if (!isMounted) {
    return (
      <EuiFlexGroup justifyContent="spaceAround" alignItems="center" style={{ minHeight: 600 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  const { templates } = templateResponse;

  return <Component {...{ templates, onCreateWorkpad }} />;
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default WorkpadTemplates;
