/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { PageTemplate } from '../page_template';

interface NoIndicesProps {
  message: string;
  title: string;
  actions: React.ReactNode;
  'data-test-subj'?: string;
}

// Represents a fully constructed page, including page template.
export const NoIndices: React.FC<NoIndicesProps> = ({ actions, message, title, ...rest }) => {
  return (
    <PageTemplate isEmptyState={true}>
      <KibanaPageTemplate.EmptyPrompt
        title={<h2>{title}</h2>}
        body={<p>{message}</p>}
        actions={actions}
        {...rest}
      />
    </PageTemplate>
  );
};
