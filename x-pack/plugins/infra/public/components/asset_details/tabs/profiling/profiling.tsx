/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { EuiSpacer, EuiTabbedContent, type EuiTabbedContentProps } from '@elastic/eui';
import React from 'react';
import { Flamegraph } from './flamegraph';
import { Functions } from './functions';

export function Profiling() {
  const tabs: EuiTabbedContentProps['tabs'] = [
    {
      id: 'flamegraph',
      name: i18n.translate('xpack.infra.profiling.flamegraphTabName', {
        defaultMessage: 'Flamegraph',
      }),
      content: (
        <>
          <EuiSpacer />
          <Flamegraph />
        </>
      ),
    },
    {
      id: 'functions',
      name: i18n.translate('xpack.infra.tabs.profiling.functionsTabName', {
        defaultMessage: 'Top 10 Functions',
      }),
      content: (
        <>
          <EuiSpacer />
          <Functions />
        </>
      ),
    },
  ];

  return (
    <>
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
    </>
  );
}
