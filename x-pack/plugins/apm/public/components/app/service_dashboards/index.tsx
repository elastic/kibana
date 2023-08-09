/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import {
  AwaitingDashboardAPI,
  DashboardRenderer,
} from '@kbn/dashboard-plugin/public';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { buildPhraseFilter, Filter, TimeRange } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/common';
import React, { useState, useEffect } from 'react';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../../common/es_fields/apm';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../common/environment_filter_values';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { DashboardSelection } from './dashboard_selection';
import { useApmDataView } from '../../../hooks/use_apm_data_view';
import { DashboardLink } from './dashboard_link';
import { KibanaDashboardLink } from '../../shared/links/dashboard_links/dashboard_link';
import { CreateDashboardLink } from '../../shared/links/dashboard_links/create_dashboard_link';

export function ServiceDashboardsView() {
  const [dashboard, setDashboard] = useState<AwaitingDashboardAPI>();
  const [selectedDashboardLink, setSelectedDashboardLink] =
    useState<DashboardLink>();
  const { dataView } = useApmDataView();
  const { serviceName } = useApmServiceContext();
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/dashboards');

  useEffect(() => {
    if (!dashboard || !selectedDashboardLink) return;
    dashboard.updateInput(
      initialInput(
        { from: rangeFrom, to: rangeTo },
        kuery,
        serviceName,
        environment,
        selectedDashboardLink.dashboardMapping.useContextFilter,
        dataView
      )
    );
  }, [
    kuery,
    serviceName,
    environment,
    dataView,
    dashboard,
    selectedDashboardLink,
    rangeFrom,
    rangeTo,
  ]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <DashboardSelection
            onSelectionChanged={(selection) =>
              setSelectedDashboardLink(selection)
            }
            showAddDashboardModal={isAddModalVisible}
            onHideAddDashboardModal={() => setAddModalVisible(false)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="apmServiceDashboardsViewShowModalButton"
            onClick={() => setAddModalVisible(true)}
            iconType="link"
            fill
          >
            Link Dashboard
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CreateDashboardLink>
            <EuiButton
              data-test-subj="apmServiceDashboardsCreateDashboardButton"
              iconType="plus"
            >
              Create Dashboard
            </EuiButton>
          </CreateDashboardLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <KibanaDashboardLink
            dashboardId={
              selectedDashboardLink?.dashboardMapping.dashboardId ?? ''
            }
            editMode={true}
          >
            <EuiButton
              data-test-subj="apmServiceDashboardsEditDashboardButton"
              iconType="pencil"
              isDisabled={!selectedDashboardLink}
            >
              Edit Dashboard
            </EuiButton>
          </KibanaDashboardLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem>
        {selectedDashboardLink && (
          <DashboardRenderer
            savedObjectId={selectedDashboardLink.dashboardMapping.dashboardId}
            getCreationOptions={async () => {
              return {
                getInitialInput: () =>
                  initialInput(
                    { from: rangeFrom, to: rangeTo },
                    kuery,
                    serviceName,
                    environment,
                    selectedDashboardLink.dashboardMapping.useContextFilter,
                    dataView
                  ),
              };
            }}
            ref={setDashboard}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function getFilters(
  serviceName: string,
  environment: string,
  dataView?: DataView
): Filter[] {
  if (!dataView || !serviceName) {
    return [];
  }

  const filter = [];

  const environmentField = dataView.getFieldByName(SERVICE_ENVIRONMENT);
  if (
    environmentField &&
    !!environment &&
    environment !== ENVIRONMENT_ALL.value &&
    environment !== ENVIRONMENT_NOT_DEFINED.value
  ) {
    const environmentFilter = buildPhraseFilter(
      environmentField,
      environment,
      dataView
    );
    filter.push(environmentFilter);
  }

  const serviceNameField = dataView.getFieldByName(SERVICE_NAME);
  if (serviceNameField) {
    const serviceNameFilter = buildPhraseFilter(
      serviceNameField,
      serviceName,
      dataView
    );
    filter.push(serviceNameFilter);
  }

  return filter;
}

function initialInput(
  timeRange: TimeRange,
  kuery: string,
  serviceName: string,
  environment: string,
  useContextFilter: boolean,
  dataView?: DataView
) {
  const filters = useContextFilter
    ? getFilters(serviceName, environment, dataView)
    : [];

  return {
    viewMode: ViewMode.VIEW,
    timeRange,
    filters,
    query: { query: kuery, language: 'kuery' },
  };
}
