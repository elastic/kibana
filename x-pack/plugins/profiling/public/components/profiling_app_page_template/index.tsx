/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeaderContentProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { SettingsFlyout } from '../settings_flyout';
import { ProfilingDatePicker } from './profiling_date_picker';

export function ProfilingAppPageTemplate({
  children,
  tabs,
}: {
  children: React.ReactElement;
  tabs: EuiPageHeaderContentProps['tabs'];
}) {
  const {
    path,
    query,
    query: { rangeFrom, rangeTo, n, projectID, index },
  } = useProfilingParams('/*');

  const {
    start: { observability, data },
  } = useProfilingDependencies();

  const { PageTemplate: ObservabilityPageTemplate } = observability.navigation;

  const profilingRouter = useProfilingRouter();
  const routePath = useProfilingRoutePath();

  useEffect(() => {
    // set time if both to and from are given in the url
    if (rangeFrom && rangeTo) {
      data.query.timefilter.timefilter.setTime({
        from: rangeFrom,
        to: rangeTo,
      });
      return;
    }
  }, [rangeFrom, rangeTo, data]);

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        paddingSize: 's',
        pageTitle: i18n.translate('xpack.profiling.appPageTemplate.pageTitle', {
          defaultMessage: 'Profiling',
        }),
        tabs,
        rightSideItems: [
          <ProfilingDatePicker
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            onTimeRangeChange={(nextTimeRange) => {
              profilingRouter.push(routePath, {
                path,
                query: {
                  ...query,
                  ...nextTimeRange,
                },
              });
            }}
          />,
          <SettingsFlyout
            title={i18n.translate('xpack.profiling.appPageTemplate.settingsTitle', {
              defaultMessage: 'Settings',
            })}
            values={{
              index,
              projectID,
              n,
            }}
            onChange={(values) => {
              profilingRouter.push(routePath, {
                path,
                query: {
                  ...query,
                  index: values.index,
                  projectID: values.projectID,
                  n: values.n,
                },
              });
            }}
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
