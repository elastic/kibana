/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { DashboardApi, DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { buildPhraseFilter, buildExistsFilter } from '@kbn/es-query';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { lensApiStateSchema } from '@kbn/lens-embeddable-utils/config_builder/schema';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../common/environment_filter_values';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import type { PanelDefinition } from './types';

export function DynamicDashboard({
  panels,
  dataView,
  dataViewsService,
}: {
  panels: PanelDefinition[];
  dataView: DataView;
  dataViewsService: DataViewsContract;
}) {
  const [dashboard, setDashboard] = useState<DashboardApi | undefined>(undefined);
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/metrics');

  const { serviceName } = useApmServiceContext();

  useEffect(() => {
    if (!dashboard) return;
    dashboard.setTimeRange({ from: rangeFrom, to: rangeTo });
    dashboard.setQuery({ query: kuery, language: 'kuery' });
  }, [kuery, dashboard, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!dashboard) return;
    dashboard.setFilters(getFilters(serviceName, environment, dataView));
  }, [dataView, serviceName, environment, dashboard]);

  const dashboardPanels = useMemo(() => {
    const builder = new LensConfigBuilder(dataViewsService);
    return panels.map((panel) => {
      const validatedConfig = lensApiStateSchema.validate(panel.config);
      const attributes = builder.fromAPIFormat(validatedConfig);
      return {
        type: 'lens',
        grid: {
          ...panel.gridConfig,
          i: panel.id,
        },
        uid: panel.id,
        config: {
          attributes,
          title: panel.title,
        },
      };
    });
  }, [panels, dataViewsService]);

  const getCreationOptions = useMemo((): (() => Promise<DashboardCreationOptions>) => {
    return async () => ({
      useControlsIntegration: true,
      getInitialInput: () => ({
        viewMode: 'view' as const,
        panels: dashboardPanels,
        pinned_panels: [
          {
            type: OPTIONS_LIST_CONTROL,
            config: {
              data_view_id: dataView.id ?? '',
              title: 'Node name',
              field_name: 'service.node.name',
            },
            width: 'medium',
            grow: true,
          },
        ],
      }),
    });
  }, [dashboardPanels, dataView.id]);

  if (dashboardPanels.length === 0) {
    return null;
  }

  return (
    <DashboardRenderer getCreationOptions={getCreationOptions} onApiAvailable={setDashboard} />
  );
}

function getFilters(serviceName: string, environment: string, dataView: DataView): Filter[] {
  const filters: Filter[] = [];

  const serviceNameField = dataView.getFieldByName('service.name');
  if (serviceNameField) {
    filters.push(buildPhraseFilter(serviceNameField, serviceName, dataView));
  }

  const environmentField = dataView.getFieldByName('service.environment');
  if (environmentField && environment && environment !== ENVIRONMENT_ALL.value) {
    if (environment === ENVIRONMENT_NOT_DEFINED.value) {
      const envExistsFilter = buildExistsFilter(environmentField, dataView);
      envExistsFilter.meta.negate = true;
      filters.push(envExistsFilter);
    } else {
      filters.push(buildPhraseFilter(environmentField, environment, dataView));
    }
  }

  return filters;
}
