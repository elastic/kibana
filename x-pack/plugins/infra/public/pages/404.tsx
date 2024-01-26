/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NotFoundPrompt } from '@kbn/shared-ux-prompt-not-found';
import { MetricsPageTemplate } from './metrics/page_template';

interface NotFoundPageProps {
  title: string;
}

export const NotFoundPage = ({ title }: NotFoundPageProps) => {
  return (
    <MetricsPageTemplate
      pageHeader={{
        pageTitle: title,
      }}
      data-test-subj="infraNotFoundPage"
    >
      <NotFoundPrompt />
    </MetricsPageTemplate>
  );
};
