/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NotFoundPrompt } from '@kbn/shared-ux-prompt-not-found';
import { LogsOptimizationPageTemplate } from '../components/page_template';

export const NotFoundPage = () => {
  return (
    <LogsOptimizationPageTemplate
      pageSectionProps={{ grow: false, paddingSize: 'xl' }}
      data-test-subj="logsOptimizationNotFoundPage"
    >
      <NotFoundPrompt />
    </LogsOptimizationPageTemplate>
  );
};
