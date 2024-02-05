/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';

function ProfilingTab() {
  return (
    <div>
      {i18n.translate('xpack.apm.profilingTab.div.caueLabel', {
        defaultMessage: 'caue',
      })}
    </div>
  );
}

export const profilingTab = {
  dataTestSubj: 'apmProfilingTabButton',
  key: 'Profiling',
  label: i18n.translate('xpack.apm.transactionDetails.tabs.ProfilingLabel', {
    defaultMessage: 'Universal Profiling',
  }),
  component: ProfilingTab,
};
