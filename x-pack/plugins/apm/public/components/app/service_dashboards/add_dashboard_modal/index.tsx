/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiFlexGroup,
  EuiSwitch,
  EuiButtonEmpty,
  EuiModalFooter,
  EuiFlexItem,
  EuiMarkdownFormat,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import styled from 'styled-components';
import {
  DashboardMappingType,
  DashboardMappingTypeEnum,
  ServiceDashboardMapping,
} from '../../../../../common/service_dashboards';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import {
  DashboardPicker,
  DashboardOption,
} from '../../../shared/dashboard_picker';
import { SelectServices } from './select_services';
import { DashboardLink } from '../dashboard_link';

const MAX_CONTAINER_HEIGHT = 600;

const Container = styled.div`
  width: 600px;
  height: ${MAX_CONTAINER_HEIGHT}px;
`;

interface AddDashboardModalProps {
  dashboardIdsToExclude: string[];
  onAddDashboard: (dashboard: DashboardLink) => void;
  onHide: () => void;
}

export function AddDashboardModal({
  dashboardIdsToExclude,
  onAddDashboard,
  onHide,
}: AddDashboardModalProps) {
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardOption>();

  const [isLoading, setIsLoading] = useState(false);
  const [kuery, setKuery] = useState<string>();
  const [dashboadMappingType, setDashboadMappingType] =
    useState<DashboardMappingType>(DashboardMappingTypeEnum.single);
  const [useContextFilter, setUseContextFilter] = useState(true);

  const {
    core: { notifications },
  } = useApmPluginContext();
  const { serviceName } = useApmServiceContext();

  const addAndClose = () => {
    if (selectedDashboard) {
      saveDashboardMapping({
        dashboardId: selectedDashboard.value,
        dashboardName: selectedDashboard.label,
        serviceName:
          dashboadMappingType === DashboardMappingTypeEnum.single
            ? serviceName
            : undefined,
        kuery:
          dashboadMappingType === DashboardMappingTypeEnum.multi
            ? kuery
            : undefined,
        type: dashboadMappingType,
        useContextFilter,
      });
      setSelectedDashboard(undefined);
    }
    onHide();
  };

  const cancel = () => {
    if (selectedDashboard) {
      setSelectedDashboard(undefined);
    }
    onHide();
  };

  const onSelectDashboard = async (dashboard: DashboardOption | null) => {
    if (dashboard) {
      setSelectedDashboard(dashboard);
    }
  };

  const saveDashboardMapping = async (
    dashboardMapping: ServiceDashboardMapping
  ) => {
    setIsLoading(true);
    try {
      const response = await callApmApi(
        'POST /internal/apm/services/dashboards',
        {
          params: {
            body: { ...dashboardMapping },
          },
          signal: null,
        }
      );
      onAddDashboard({
        label: response.dashboardName,
        value: response.id,
        dashboardMapping: response,
      });
      notifications.toasts.addSuccess(
        getCreateSuccessToastLabels(dashboardMapping)
      );
    } catch (error) {
      console.error(error);
      notifications.toasts.addDanger(
        getCreateFailureToastLabels(dashboardMapping, error)
      );
    }
    setIsLoading(false);
  };

  return (
    <EuiOverlayMask>
      <Container>
        <EuiModal onClose={cancel}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Select dashboard</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiFlexGroup direction="column" justifyContent="center">
              <DashboardPicker
                isDisabled={isLoading}
                onChange={onSelectDashboard}
                fullWidth={true}
                idsToOmit={dashboardIdsToExclude}
              />
              <EuiSwitch
                label={
                  <EuiMarkdownFormat>
                    {i18n.translate(
                      'xpack.apm.dashboardMappings.addDashboard.useContextFilterLabel',
                      {
                        defaultMessage: 'Filter by `service` and `environment`',
                      }
                    )}
                  </EuiMarkdownFormat>
                }
                onChange={() => setUseContextFilter(!useContextFilter)}
                checked={useContextFilter}
              />
              <EuiSwitch
                label={i18n.translate(
                  'xpack.apm.dashboardMappings.addDashboard.applyMultipleServicesLabel',
                  {
                    defaultMessage: 'Apply to multiple services',
                  }
                )}
                onChange={() =>
                  setDashboadMappingType(
                    dashboadMappingType === DashboardMappingTypeEnum.multi
                      ? DashboardMappingTypeEnum.single
                      : DashboardMappingTypeEnum.multi
                  )
                }
                checked={dashboadMappingType === DashboardMappingTypeEnum.multi}
              />
              <SelectServices
                onChange={(kql) => setKuery(kql)}
                isDisabled={
                  dashboadMappingType === DashboardMappingTypeEnum.single
                }
              />
            </EuiFlexGroup>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiFlexGroup direction="row" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="apmAddDashboardModalCancelButton"
                  onClick={cancel}
                  disabled={isLoading}
                >
                  {i18n.translate(
                    'xpack.apm.dashboardMappings.selectServicesForm.cancel',
                    {
                      defaultMessage: 'Cancel',
                    }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="apmAddDashboardModalAddButton"
                  onClick={addAndClose}
                  color={'primary'}
                  fill={true}
                  disabled={
                    isLoading ||
                    !selectedDashboard ||
                    (dashboadMappingType === DashboardMappingTypeEnum.multi &&
                      !kuery)
                  }
                >
                  {i18n.translate(
                    'xpack.apm.dashboardMappings.selectServicesForm.add',
                    {
                      defaultMessage: 'Add',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalFooter>
        </EuiModal>
      </Container>
    </EuiOverlayMask>
  );
}

function getCreateSuccessToastLabels({
  dashboardName,
  serviceName,
}: ServiceDashboardMapping) {
  return {
    title: i18n.translate(
      'xpack.apm.serviceCustomDashboards.createSucess.toast.title',
      {
        defaultMessage: 'Added "{dashboardName}" dashboard',
        values: { dashboardName },
      }
    ),
    text: i18n.translate(
      'xpack.apm.serviceCustomDashboards.createSuccess.toast.text',
      {
        defaultMessage:
          'Dashboard "{dashboardName}" has been added to "{serviceName}" service.',
        values: { dashboardName, serviceName },
      }
    ),
  };
}

function getCreateFailureToastLabels(
  { dashboardName, serviceName }: ServiceDashboardMapping,
  error: Error & { body: { message: string } }
) {
  return {
    title: i18n.translate(
      'xpack.apm.serviceCustomDashboards.createFailure.toast.title',
      {
        defaultMessage: 'Error while adding "{dashboardName}" dashboard',
        values: { dashboardName },
      }
    ),
    text: error.body.message,
  };
}
