/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { TimeRange } from '../../../common/types';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { SettingsFlyout } from '../settings_flyout';
import { ProfilingDatePicker } from './profiling_date_picker';

export function ProfilingAppPageTemplate({
  children,
  timeRange,
  onTimeRangeChange,
  index,
  onIndexChange,
  projectID,
  onProjectIDChange,
  n,
  onNChange,
}: {
  children: React.ReactElement;
  timeRange: TimeRange;
  onTimeRangeChange: (nextTimeRange: TimeRange) => void;
  index: string;
  onIndexChange: (nextIndex: string) => void;
  projectID: number;
  onProjectIDChange: (nextProjectID: number) => void;
  n: number;
  onNChange: (nextN: number) => void;
}) {
  const {
    start: { observability },
  } = useProfilingDependencies();

  const { PageTemplate: ObservabilityPageTemplate } = observability.navigation;

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        paddingSize: 's',
        pageTitle: i18n.translate('xpack.profiling.appPageTemplate.pageTitle', {
          defaultMessage: 'Profiling',
        }),
        rightSideItems: [
          <ProfilingDatePicker timeRange={timeRange} onTimeRangeChange={onTimeRangeChange} />,
          <SettingsFlyout
            title={i18n.translate('xpack.profiling.appPageTemplate.settingsTitle', {
              defaultMessage: 'Settings',
            })}
            defaultIndex={index}
            updateIndex={onIndexChange}
            defaultProjectID={projectID}
            updateProjectID={onProjectIDChange}
            defaultN={n}
            updateN={onNChange}
          />,
        ],
      }}
      pageBodyProps={{
        paddingSize: 'none',
      }}
    >
      {children}
    </ObservabilityPageTemplate>
  );
}
