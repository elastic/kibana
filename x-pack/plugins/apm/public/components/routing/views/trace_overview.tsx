/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RouteComponentProps } from 'react-router-dom';
import React from 'react';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';
import { TraceOverview } from '../../app/trace_overview';

const pageTitle = i18n.translate('xpack.apm.views.traceOverview.title', {
  defaultMessage: 'Traces',
});

export const traceOverviewRoute = {
  exact: true,
  path: '/traces', // !! Need to be kept in sync with the deepLinks in x-pack/plugins/apm/public/plugin.ts
  component: TraceOverviewView,
  breadcrumb: pageTitle,
};

function TraceOverviewView(props: RouteComponentProps) {
  return (
    <ApmMainTemplate pageTitle={pageTitle}>
      <TraceOverview />
    </ApmMainTemplate>
  );
}
