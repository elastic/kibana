/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { EuiSpacer, EuiTabbedContent, type EuiTabbedContentProps } from '@elastic/eui';
import React from 'react';
import { ProfilingEmptyState } from '@kbn/observability-shared-plugin/public';
import { EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import { Flamegraph } from './flamegraph';
import { Functions } from './functions';
import { DatePicker } from '../../date_picker/date_picker';
import { useProfilingStatusData } from '../../hooks/use_profiling_status_data';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { ContentTabIds } from '../../types';
import { ErrorPrompt } from './error_prompt';

export function Profiling() {
  const { activeTabId } = useTabSwitcherContext();
  const { error, loading, response } = useProfilingStatusData({
    isActive: activeTabId === ContentTabIds.PROFILING,
  });

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

  if (loading) {
    return (
      <div
        css={css`
          display: flex;
          justify-content: center;
        `}
      >
        <EuiLoadingSpinner size="m" />
      </div>
    );
  }

  if (error !== null) {
    return <ErrorPrompt />;
  }

  return (
    <>
      {response?.has_setup === false ? (
        <ProfilingEmptyState />
      ) : (
        <>
          <DatePicker />
          <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
        </>
      )}
    </>
  );
}
