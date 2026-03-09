/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';

import type { DashboardApi, DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { buildExistsFilter, buildPhraseFilter } from '@kbn/es-query';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { i18n } from '@kbn/i18n';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import type { LensApiState } from '@kbn/lens-embeddable-utils/config_builder/schema';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../common/environment_filter_values';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import type { PanelDefinition } from './panels/jvm_panels';

interface CodeBasedMetricsDashboardProps {
  panels: PanelDefinition[];
  dataView: DataView;
}

export function CodeBasedMetricsDashboard({ panels, dataView }: CodeBasedMetricsDashboardProps) {
  const [dashboard, setDashboard] = useState<DashboardApi | undefined>(undefined);
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/metrics');

  const {
    core: { notifications },
  } = useApmPluginContext();

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

  const getCreationOptions = useCallback(async (): Promise<DashboardCreationOptions> => {
    try {
      const builtPanels = buildPanelsFromDefinitions(panels);

      return {
        useControlsIntegration: true,
        getInitialInput: () => ({
          viewMode: 'view',
          time_range: { from: rangeFrom, to: rangeTo },
          panels: builtPanels,
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
      };
    } catch (error) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.apm.codeBasedMetricsDashboard.loadFailure.toast.title', {
          defaultMessage: 'Error while loading metrics dashboard.',
        }),
        text: error instanceof Error ? error.message : String(error),
      });
      return {};
    }
  }, [panels, dataView, notifications, rangeFrom, rangeTo]);

  return (
    <DashboardRenderer getCreationOptions={getCreationOptions} onApiAvailable={setDashboard} />
  );
}

function buildPanelsFromDefinitions(panelDefs: PanelDefinition[]): DashboardState['panels'] {
  const builder = new LensConfigBuilder();

  return panelDefs.map((panelDef) => {
    const lensAttributes: LensAttributes = builder.fromAPIFormat(panelDef.config as LensApiState);

    return {
      type: 'lens',
      grid: {
        i: panelDef.id,
        ...panelDef.gridConfig,
      },
      uid: panelDef.id,
      config: {
        title: panelDef.title,
        hidePanelTitles: false,
        enhancements: {},
        attributes: lensAttributes,
      },
    };
  });
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
