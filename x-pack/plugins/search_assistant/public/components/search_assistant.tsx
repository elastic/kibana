/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate } from '@elastic/eui';
import React from 'react';
import { App } from './app';

export const SearchAssistantPage: React.FC = () => {
  return (
    <EuiPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="svlSearchAssistantPage"
      grow={false}
      panelled={false}
    >
      <App />
    </EuiPageTemplate>
  );
};
