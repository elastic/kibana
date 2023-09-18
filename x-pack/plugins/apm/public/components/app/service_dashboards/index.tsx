/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBoxOptionOption,
  EuiComboBox,
} from '@elastic/eui';

import { EmptyDashboards } from './empty_dashboards';
import { AddDashboard } from './actions';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useApmParams } from '../../../hooks/use_apm_params';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  AwaitingDashboardAPI,
  DashboardCreationOptions,
  DashboardRenderer,
} from '@kbn/dashboard-plugin/public';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';

export function ServiceDashboards() {
  const {
    path: { serviceName },
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/dashboards');
  const [dashboard, setDashboard] = useState<AwaitingDashboardAPI>();
  const [selectedDashboard, setSelectedDashboard] =
    useState<EuiComboBoxOptionOption<string>>();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (serviceName) {
        return callApmApi(
          `GET /internal/apm/services/{serviceName}/dashboards`,
          {
            params: {
              path: { serviceName },
            },
          }
        );
      }
    },
    [serviceName]
  );

  console.log('data====', data);

  const getCreationOptions =
    useCallback((): Promise<DashboardCreationOptions> => {
      const getInitialInput = () => ({
        viewMode: ViewMode.VIEW,
        timeRange: { from: rangeFrom, to: rangeTo },
        query: { query: kuery, language: 'kuery' },
      });
      return Promise.resolve<DashboardCreationOptions>({ getInitialInput });
    }, [rangeFrom, rangeTo, kuery]);

  useEffect(() => {
    if (!dashboard) return;
    console.log('update');
    dashboard.updateInput({
      viewMode: ViewMode.VIEW,
      timeRange: { from: rangeFrom, to: rangeTo },
      query: { query: kuery, language: 'kuery' },
    });
  }, [kuery, serviceName, environment, rangeFrom, rangeTo, selectedDashboard]);

  console.log('///selectedDashboard', selectedDashboard);
  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}> Custom</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddDashboard />
        </EuiFlexItem>
      </EuiFlexGroup>

      {data && selectedDashboard ? (
        <>
          <EuiComboBox
            placeholder={i18n.translate(
              'xpack.apm.serviceDashboards.selectDashboard.placeholder',
              {
                defaultMessage: 'Select dasbboard',
              }
            )}
            singleSelection={{ asPlainText: true }}
            options={data?.serviceSpecificDashboards.map(
              (dashboardItem: DashboardItem) => ({
                label: dashboardItem.dashboardTitle,
                value: dashboardItem.dashboardSavedObjectId,
              })
            )}
            selectedOptions={selectedDashboard}
            onChange={(newSelection) => setSelectedDashboard(newSelection)}
            isClearable={true}
          />
          <DashboardRenderer
            savedObjectId={selectedDashboard.value}
            getCreationOptions={getCreationOptions}
            ref={setDashboard}
          />
        </>
      ) : (
        <EmptyDashboards actions={<AddDashboard />} />
      )}
    </EuiPanel>
  );
}
