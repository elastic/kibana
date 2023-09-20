/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSwitch,
  EuiModalBody,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DashboardItem } from '@kbn/dashboard-plugin/common/content_management';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import { useDashboardFetcher } from '../../../../hooks/use_dashboards_fetcher';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { DashboardTypeEnum } from '../../../../../common/service_dashboards';
import { SavedServiceDashboard } from '../../../../../common/service_dashboards';

interface Props {
  onClose: () => void;
  onRefresh: () => void;
  currentDashboard?: SavedServiceDashboard;
}

export function SelectDashboard({
  onClose,
  onRefresh,
  currentDashboard,
}: Props) {
  const {
    core: { notifications },
  } = useApmPluginContext();
  const { data, status } = useDashboardFetcher();
  let defaultOption: EuiComboBoxOptionOption<string> | undefined;

  const [useContextFilter, setUseContextFilter] = useState(
    currentDashboard?.useContextFilter ?? true
  );

  if (currentDashboard) {
    const { dashboardTitle, dashboardSavedObjectId } = currentDashboard;
    defaultOption = { label: dashboardTitle, value: dashboardSavedObjectId };
  }

  const [selectedDashboard, setSelectedDashboard] = useState(
    defaultOption ? [defaultOption] : []
  );

  const isEditMode = !!currentDashboard?.id;

  const {
    path: { serviceName },
  } = useApmParams('/services/{serviceName}/dashboards');

  const reloadServiceDashboards = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const onSave = useCallback(
    async function () {
      const [newDashboard] = selectedDashboard;
      try {
        await callApmApi('POST /internal/apm/service-dashboard', {
          params: {
            query: { serviceDashboardId: currentDashboard?.id },
            body: {
              dashboardTitle: newDashboard.label,
              dashboardSavedObjectId: newDashboard.value,
              useContextFilter,
              linkTo: DashboardTypeEnum.single, // iteration-1: Only single supported
              serviceName,
            },
          },
          signal: null,
        });
        notifications.toasts.addSuccess({
          title: i18n.translate(
            'xpack.apm.serviceDashboards.addSuccess.toast.title',
            {
              defaultMessage: 'Added "{dashboardName}" dashboard',
              values: { dashboardName: newDashboard.label },
            }
          ),
          text: i18n.translate(
            'xpack.apm.serviceDashboards.addSuccess.toast.text',
            {
              defaultMessage:
                'Your dashboard is now visible in the service overview page.',
            }
          ),
        });
        reloadServiceDashboards();
      } catch (error) {
        console.error(error);
        notifications.toasts.addDanger({
          title: i18n.translate(
            'xpack.apm.serviceDashboards.addFailure.toast.title',
            {
              defaultMessage: 'Error while adding "{dashboardName}" dashboard',
              values: { dashboardName: newDashboard.label },
            }
          ),
          text: error.body.message,
        });
      }
      onClose();
    },
    [selectedDashboard, notifications.toasts, useContextFilter]
  );

  console.log('isEditMode', isEditMode);
  return (
    <EuiModal onClose={onClose} data-test-subj="apmSelectServiceDashboard">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate(
            'xpack.apm.serviceDashboards.selectDashboard.modalTitle',
            {
              defaultMessage: 'Select dashboard',
            }
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup direction="column" justifyContent="center">
          <EuiComboBox
            isLoading={status === FETCH_STATUS.LOADING}
            isDisabled={status === FETCH_STATUS.LOADING}
            placeholder={
              isEditMode
                ? i18n.translate(
                    'xpack.apm.serviceDashboards.selectDashboard.placeholder.edit',
                    {
                      defaultMessage: 'Edit dasbboard',
                    }
                  )
                : i18n.translate(
                    'xpack.apm.serviceDashboards.selectDashboard.placeholder',
                    {
                      defaultMessage: 'Select dasbboard',
                    }
                  )
            }
            singleSelection={{ asPlainText: true }}
            options={data?.map((dashboardItem: DashboardItem) => ({
              label: dashboardItem.attributes.title,
              value: dashboardItem.id,
            }))}
            selectedOptions={selectedDashboard}
            onChange={(newSelection) => setSelectedDashboard(newSelection)}
            isClearable={true}
          />

          <EuiSwitch
            label={i18n.translate(
              'xpack.apm.dashboard.addDashboard.useContextFilterLabel',
              {
                defaultMessage: 'Filter by `service` and `environment`',
              }
            )}
            onChange={() => setUseContextFilter(!useContextFilter)}
            checked={useContextFilter}
          />
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton
          data-test-subj="apmSelectDashboardCancelButton"
          onClick={onClose}
          fill
        >
          {i18n.translate(
            'xpack.apm.serviceDashboards.selectDashboard.cancel',
            {
              defaultMessage: 'Cancel',
            }
          )}
        </EuiButton>
        <EuiButton
          data-test-subj="apmSelectDashboardButton"
          onClick={onSave}
          fill
        >
          {isEditMode
            ? i18n.translate(
                'xpack.apm.serviceDashboards.selectDashboard.edit',
                {
                  defaultMessage: 'Save',
                }
              )
            : i18n.translate(
                'xpack.apm.serviceDashboards.selectDashboard.add',
                {
                  defaultMessage: 'Link dashboard',
                }
              )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
