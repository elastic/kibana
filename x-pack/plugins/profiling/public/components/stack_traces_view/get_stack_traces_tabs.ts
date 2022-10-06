/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeaderContentProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import { TopNType } from '../../../common/stack_traces';
import { StatefulProfilingRouter } from '../../hooks/use_profiling_router';
import { ProfilingRoutes } from '../../routing';

export function getStackTracesTabs({
  path,
  query,
  profilingRouter,
}: TypeOf<ProfilingRoutes, '/stacktraces/{topNType}'> & {
  profilingRouter: StatefulProfilingRouter;
}): Required<EuiPageHeaderContentProps>['tabs'] {
  return [
    {
      label: i18n.translate('xpack.profiling.stackTracesView.containersTabLabel', {
        defaultMessage: 'Containers',
      }),
      topNType: TopNType.Containers,
    },
    {
      label: i18n.translate('xpack.profiling.stackTracesView.deploymentsTabLabel', {
        defaultMessage: 'Deployments',
      }),
      topNType: TopNType.Deployments,
    },
    {
      label: i18n.translate('xpack.profiling.stackTracesView.threadsTabLabel', {
        defaultMessage: 'Threads',
      }),
      topNType: TopNType.Threads,
    },
    {
      label: i18n.translate('xpack.profiling.stackTracesView.hostsTabLabel', {
        defaultMessage: 'Hosts',
      }),
      topNType: TopNType.Hosts,
    },
    {
      label: i18n.translate('xpack.profiling.stackTracesView.tracesTabLabel', {
        defaultMessage: 'Traces',
      }),
      topNType: TopNType.Traces,
    },
  ].map((tab) => ({
    label: tab.label,
    isSelected: tab.topNType === path.topNType,
    href: profilingRouter.link(`/stacktraces/{topNType}`, {
      path: { topNType: tab.topNType },
      query,
    }),
  }));
}
