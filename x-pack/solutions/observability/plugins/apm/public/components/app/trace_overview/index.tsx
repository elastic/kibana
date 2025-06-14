/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';
import { Breadcrumb } from '../breadcrumb';

export function TraceOverview({ children }: { children: React.ReactElement }) {
  const title = i18n.translate('xpack.apm.views.traceOverview.title', {
    defaultMessage: 'Traces',
  });

  return (
    <Breadcrumb href="/traces" title={title} omitOnServerless>
      <ApmMainTemplate
        pageTitle={title}
        pageSectionProps={{
          contentProps: {
            style: {
              display: 'flex',
              flexGrow: 1,
            },
          },
        }}
      >
        {children}
      </ApmMainTemplate>
    </Breadcrumb>
  );
}
