/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  DashboardContainerRenderer,
  type DashboardContainer,
  type DashboardCreationOptions,
} from '@kbn/dashboard-plugin/public';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { useBreadcrumbContainerContext } from '../../hooks/use_breadcrumbs';
import { useMonitoringTimeContainerContext } from '../../hooks/use_monitoring_time';
import { ComponentProps } from '../../route_init';
import { ElasticsearchTemplate } from './elasticsearch_template';

export const ElasticsearchDashboardsPage: React.FC<ComponentProps> = ({ clusters }) => {
  const { currentTimerange, refreshInterval, isPaused } = useMonitoringTimeContainerContext();
  const globalState = useContext(GlobalStateContext);
  const { generate: generateBreadcrumbs } = useBreadcrumbContainerContext();

  const clusterUuid = globalState.cluster_uuid;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inElasticsearch: true,
      });
    }
  }, [cluster, generateBreadcrumbs]);

  const title = i18n.translate('xpack.monitoring.elasticsearch.dashboards.title', {
    defaultMessage: 'Elasticsearch - Dashboards',
  });

  const pageTitle = i18n.translate('xpack.monitoring.elasticsearch.dashboards.pageTitle', {
    defaultMessage: 'Elasticsearch Dashboards',
  });

  const getCreationOptions = useCallback((): DashboardCreationOptions => {
    return {
      overrideInput: {
        timeRange: {
          from: currentTimerange.from,
          to: currentTimerange.to,
        },
        refreshInterval: {
          value: refreshInterval,
          pause: isPaused,
        },
      },
    };
  }, [currentTimerange, refreshInterval, isPaused]);

  const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer>();

  useEffect(() => {
    if (!dashboardContainer) {
      return;
    }

    dashboardContainer.updateInput({
      timeRange: {
        from: currentTimerange.from,
        to: currentTimerange.to,
      },
      refreshInterval: {
        value: refreshInterval,
        pause: isPaused,
      },
    });
  }, [dashboardContainer, currentTimerange, refreshInterval, isPaused]);

  return (
    <ElasticsearchTemplate title={title} pageTitle={pageTitle} cluster={cluster}>
      <DashboardContainerRenderer
        savedObjectId={'c2bfad70-9328-11ed-b23a-f106da67ae00'}
        getCreationOptions={getCreationOptions}
        onDashboardContainerLoaded={(container) => setDashboardContainer(container)}
      />
    </ElasticsearchTemplate>
  );
};
