/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
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
  EuiToolTip,
  EuiIcon,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DashboardItem } from '@kbn/dashboard-plugin/common/content_management';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import { useDashboardFetcher } from '../../../../hooks/use_dashboards_fetcher';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { SERVICE_NAME } from '../../../../../common/es_fields/apm';
import { fromQuery, toQuery } from '../../../shared/links/url_helpers';
import { MergedServiceDashboard } from '..';

interface Props {
  onClose: () => void;
  onRefresh: () => void;
  currentDashboard?: MergedServiceDashboard;
  serviceDashboards?: MergedServiceDashboard[];
  serviceName: string;
}

export function SaveDashboardModal({
  onClose,
  onRefresh,
  currentDashboard,
  serviceDashboards,
  serviceName,
}: Props) {
  const {
    core: { notifications },
  } = useApmPluginContext();
  const { data: allAvailableDashboards, status } = useDashboardFetcher();
  const history = useHistory();

  let defaultOption: EuiComboBoxOptionOption<string> | undefined;

  const [serviceFiltersEnabled, setserviceFiltersEnabled] = useState(
    (currentDashboard?.serviceEnvironmentFilterEnabled &&
      currentDashboard?.serviceNameFilterEnabled) ??
      true
  );

  if (currentDashboard) {
    const { title, dashboardSavedObjectId } = currentDashboard;
    defaultOption = { label: title, value: dashboardSavedObjectId };
  }

  const [selectedDashboard, setSelectedDashboard] = useState(
    defaultOption ? [defaultOption] : []
  );

  const isEditMode = !!currentDashboard?.id;

  const reloadCustomDashboards = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const options = allAvailableDashboards?.map(
    (dashboardItem: DashboardItem) => ({
      label: dashboardItem.attributes.title,
      value: dashboardItem.id,
      disabled:
        serviceDashboards?.some(
          ({ dashboardSavedObjectId }) =>
            dashboardItem.id === dashboardSavedObjectId
        ) ?? false,
    })
  );
  const onClickSave = useCallback(
    async function () {
      const [newDashboard] = selectedDashboard;
      try {
        if (newDashboard.value) {
          await callApmApi('POST /internal/apm/custom-dashboard', {
            params: {
              query: { customDashboardId: currentDashboard?.id },
              body: {
                dashboardSavedObjectId: newDashboard.value,
                serviceEnvironmentFilterEnabled: serviceFiltersEnabled,
                serviceNameFilterEnabled: serviceFiltersEnabled,
                kuery: `${SERVICE_NAME}: ${serviceName}`,
              },
            },
            signal: null,
          });

          notifications.toasts.addSuccess(
            isEditMode
              ? getEditSuccessToastLabels(newDashboard.label)
              : getLinkSuccessToastLabels(newDashboard.label)
          );
          history.push({
            ...history.location,
            search: fromQuery({
              ...toQuery(location.search),
              dashboardId: newDashboard.value,
            }),
          });
          reloadCustomDashboards();
        }
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
    [
      selectedDashboard,
      notifications.toasts,
      serviceFiltersEnabled,
      onClose,
      reloadCustomDashboards,
      isEditMode,
      serviceName,
      currentDashboard,
      history,
    ]
  );

  return (
    <EuiModal onClose={onClose} data-test-subj="apmSelectServiceDashboard">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {isEditMode
            ? i18n.translate(
                'xpack.apm.serviceDashboards.selectDashboard.modalTitle.edit',
                {
                  defaultMessage: 'Edit dashboard',
                }
              )
            : i18n.translate(
                'xpack.apm.serviceDashboards.selectDashboard.modalTitle.link',
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
            isDisabled={status === FETCH_STATUS.LOADING || isEditMode}
            placeholder={i18n.translate(
              'xpack.apm.serviceDashboards.selectDashboard.placeholder',
              {
                defaultMessage: 'Select dashboard',
              }
            )}
            singleSelection={{ asPlainText: true }}
            options={options}
            selectedOptions={selectedDashboard}
            onChange={(newSelection) => setSelectedDashboard(newSelection)}
            isClearable={true}
          />

          <EuiSwitch
            css={{ alignItems: 'center' }}
            compressed
            label={
              <p>
                {i18n.translate(
                  'xpack.apm.dashboard.addDashboard.useContextFilterLabel',
                  {
                    defaultMessage: 'Filter by service and environment',
                  }
                )}{' '}
                <EuiToolTip
                  position="bottom"
                  content={i18n.translate(
                    'xpack.apm.dashboard.addDashboard.useContextFilterLabel.tooltip',
                    {
                      defaultMessage:
                        'Enabling this option will apply filters to the dashboard based on your chosen service and environment.',
                    }
                  )}
                >
                  <EuiIcon type="questionInCircle" title="Icon with tooltip" />
                </EuiToolTip>
              </p>
            }
            onChange={() => setserviceFiltersEnabled(!serviceFiltersEnabled)}
            checked={serviceFiltersEnabled}
          />
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="apmSelectDashboardCancelButton"
          onClick={onClose}
        >
          {i18n.translate(
            'xpack.apm.serviceDashboards.selectDashboard.cancel',
            {
              defaultMessage: 'Cancel',
            }
          )}
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="apmSelectDashboardButton"
          onClick={onClickSave}
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

function getLinkSuccessToastLabels(dashboardName: string) {
  return {
    title: i18n.translate(
      'xpack.apm.serviceDashboards.linkSuccess.toast.title',
      {
        defaultMessage: 'Added "{dashboardName}" dashboard',
        values: { dashboardName },
      }
    ),
    text: i18n.translate('xpack.apm.serviceDashboards.linkSuccess.toast.text', {
      defaultMessage:
        'Your dashboard is now visible in the service overview page.',
    }),
  };
}

function getEditSuccessToastLabels(dashboardName: string) {
  return {
    title: i18n.translate(
      'xpack.apm.serviceDashboards.editSuccess.toast.title',
      {
        defaultMessage: 'Edited "{dashboardName}" dashboard',
        values: { dashboardName },
      }
    ),
    text: i18n.translate('xpack.apm.serviceDashboards.editSuccess.toast.text', {
      defaultMessage: 'Your dashboard link have been updated',
    }),
  };
}
