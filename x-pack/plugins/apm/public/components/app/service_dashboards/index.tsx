/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { buildPhraseFilter, Filter, TimeRange } from '@kbn/es-query';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBoxOptionOption,
  EuiComboBox,
} from '@elastic/eui';

import { EmptyDashboards } from './empty_dashboards';
import { AddDashboard } from './actions';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useApmParams } from '../../../hooks/use_apm_params';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  AwaitingDashboardAPI,
  DashboardCreationOptions,
  DashboardRenderer,
} from '@kbn/dashboard-plugin/public';
import { SavedServiceDashboard } from '../../../../common/service_dashboards';
import { ContextMenu } from './context_menu';

export function ServiceDashboards() {
  const {
    path: { serviceName },
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/dashboards');
  const [dashboard, setDashboard] = useState<AwaitingDashboardAPI>();
  const [selectedDashboard, setSelectedDashboard] =
    useState<SavedServiceDashboard>();

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

  // function getFilters(
  //   serviceName: string,
  //   environment: string,
  // ): Filter[] {

  //   const filter = [];

  //   const environmentField = dataView.getFieldByName(SERVICE_ENVIRONMENT);
  //   if (
  //     environmentField &&
  //     !!environment &&
  //     environment !== ENVIRONMENT_ALL.value &&
  //     environment !== ENVIRONMENT_NOT_DEFINED.value
  //   ) {
  //     const environmentFilter = buildPhraseFilter(
  //       environmentField,
  //       environment,
  //     );
  //     filter.push(environmentFilter);
  //   }

  //   const serviceNameField = dataView.getFieldByName(SERVICE_NAME);
  //   if (serviceNameField) {
  //     const serviceNameFilter = buildPhraseFilter(
  //       serviceNameField,
  //       serviceName,
  //       dataView
  //     );
  //     filter.push(serviceNameFilter);
  //   }

  //   return filter;
  // }

  const getCreationOptions =
    useCallback((): Promise<DashboardCreationOptions> => {
      console.log('selectedDashboard', selectedDashboard);
      const getInitialInput = () => ({
        viewMode: ViewMode.VIEW,
        timeRange: { from: rangeFrom, to: rangeTo },
        query: { query: kuery, language: 'kuery' },
      });
      return Promise.resolve<DashboardCreationOptions>({ getInitialInput });
    }, [rangeFrom, rangeTo, kuery, selectedDashboard]);

  const serviceDashboards = data?.serviceDashboards ?? [];

  useEffect(() => {
    if (!dashboard) return;

    dashboard.updateInput({
      viewMode: ViewMode.VIEW,
      timeRange: { from: rangeFrom, to: rangeTo },
      // TODO useContextFilter
      query: { query: kuery, language: 'kuery' },
    });
  }, [
    serviceDashboards,
    kuery,
    serviceName,
    environment,
    rangeFrom,
    rangeTo,
    selectedDashboard,
  ]);

  const handleOnChange = (selectedId: string) => {
    setSelectedDashboard(
      serviceDashboards.find(
        ({ dashboardSavedObjectId }) => dashboardSavedObjectId === selectedId
      )
    );
  };

  return (
    <EuiPanel hasBorder={true}>
      {status !== FETCH_STATUS.LOADING && serviceDashboards.length > 0 ? (
        <>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              {selectedDashboard?.dashboardTitle}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* <EuiComboBox
                compressed
                style={{ minWidth: '200px' }}
                placeholder={i18n.translate(
                  'xpack.apm.serviceDashboards.selectDashboard.placeholder',
                  {
                    defaultMessage: 'Select dasbboard',
                  }
                )}
                prepend={i18n.translate(
                  'xpack.apm.serviceDashboards.selectDashboard.prepend',
                  {
                    defaultMessage: 'Dasbboard',
                  }
                )}
                singleSelection={{ asPlainText: true }}
                options={options}
                selectedOptions={[
                  {
                    value: selectedDashboard.dashboardSavedObjectId,
                    label: selectedDashboard.dashboardTitle,
                  },
                ]}
                onChange={([newSelectedDashboard]) =>
                  setSelectedDashboard(
                    serviceDashboards.find(
                      ({ dashboardSavedObjectId }) =>
                        dashboardSavedObjectId === newSelectedDashboard.value
                    )
                  )
                }
                isClearable={true}
              /> */}
            </EuiFlexItem>
            <ContextMenu
              handleOnChange={handleOnChange}
              selectedDashboard={selectedDashboard}
              serviceDashboards={data?.serviceDashboards}
            />
          </EuiFlexGroup>

          {selectedDashboard && (
            <DashboardRenderer
              savedObjectId={selectedDashboard.dashboardSavedObjectId}
              getCreationOptions={getCreationOptions}
              ref={setDashboard}
            />
          )}
        </>
      ) : (
        <EmptyDashboards actions={<AddDashboard />} />
      )}
    </EuiPanel>
  );
}
