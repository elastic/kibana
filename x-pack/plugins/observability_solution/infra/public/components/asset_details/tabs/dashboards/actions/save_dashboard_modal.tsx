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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  DashboardItemWithTitle,
  InfraCustomDashboardAssetType,
} from '../../../../../../common/custom_dashboards';
// import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import { useDashboardFetcher, FETCH_STATUS } from '../../../hooks/use_dashboards_fetcher';
import { useUpdateCustomDashboard } from '../../../hooks/use_update_custom_dashboards';
import { useCustomDashboard } from '../../../hooks/use_custom_dashboards';
// import { SERVICE_NAME } from '../../../../../common/es_fields/apm';
// import { fromQuery, toQuery } from '../../../shared/links/url_helpers';

interface Props {
  onClose: () => void;
  onRefresh: () => void;
  currentDashboard?: DashboardItemWithTitle;
  customDashboards?: DashboardItemWithTitle[];
  assetType: InfraCustomDashboardAssetType;
}

export function SaveDashboardModal({
  onClose,
  onRefresh,
  currentDashboard,
  customDashboards,
  assetType,
}: Props) {
  const { notifications } = useKibana();
  const { data: allAvailableDashboards, status } = useDashboardFetcher();
  const history = useHistory();
  console.log('allAvailableDashboards', allAvailableDashboards);

  let defaultOption: EuiComboBoxOptionOption<string> | undefined;

  const [assetNameEnabled, setAssetNameFiltersEnabled] = useState(
    currentDashboard?.hostNameFilterEnabled ?? true
  );

  if (currentDashboard) {
    const { title, id } = currentDashboard;
    defaultOption = { label: title, value: id };
  }

  const [selectedDashboard, setSelectedDashboard] = useState(defaultOption ? [defaultOption] : []);

  // const { result } = useUpdateCustomDashboard({ assetType, dashboardIdList: customDashboards });
  const { loading, updateCustomDashboard } = useUpdateCustomDashboard();
  const {
    dashboards,
    loading: savedObjectDashboardsLoading,
    error: savedObjectDashboardsError,
  } = useCustomDashboard({ assetType });

  const isEditMode = !!currentDashboard?.id;

  const reloadCustomDashboards = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const options = allAvailableDashboards?.map((dashboardItem: DashboardItem) => ({
    label: dashboardItem.attributes.title,
    value: dashboardItem.id,
    disabled: customDashboards?.some(({ id }) => dashboardItem.id === id) ?? false,
  }));

  const onClickSave = useCallback(
    async function () {
      const [newDashboard] = selectedDashboard;
      try {
        if (newDashboard.value && !savedObjectDashboardsLoading) {
          const result = await updateCustomDashboard({
            assetType,
            dashboardIdList: [
              ...(dashboards?.dashboardIdList ?? []),
              {
                id: newDashboard.value,
                hostNameFilterEnabled: assetNameEnabled,
              },
            ],
          });

          if (result && !loading && !savedObjectDashboardsError) {
            notifications.toasts.success(
              isEditMode
                ? getEditSuccessToastLabels(newDashboard.label)
                : getLinkSuccessToastLabels(newDashboard.label)
            );
            // history.push({
            //   ...history.location,
            //   search: fromQuery({
            //     ...toQuery(location.search),
            //     dashboardId: newDashboard.value,
            //   }),
            // });
            reloadCustomDashboards();
          }
        }
      } catch (error) {
        console.error(error);
        notifications.toasts.danger({
          title: i18n.translate('xpack.infra.customDashboards.addFailure.toast.title', {
            defaultMessage: 'Error while adding "{dashboardName}" dashboard',
            values: { dashboardName: newDashboard.label },
            // text: error.body.message,
          }),
        });
      }
      onClose();
    },
    [
      selectedDashboard,
      onClose,
      savedObjectDashboardsLoading,
      updateCustomDashboard,
      assetType,
      dashboards?.dashboardIdList,
      assetNameEnabled,
      loading,
      savedObjectDashboardsError,
      notifications.toasts,
      isEditMode,
      reloadCustomDashboards,
    ]
  );

  return (
    <EuiModal onClose={onClose} data-test-subj="apmSelectServiceDashboard">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {isEditMode
            ? i18n.translate('xpack.infra.customDashboards.selectDashboard.modalTitle.edit', {
                defaultMessage: 'Edit dashboard',
              })
            : i18n.translate('xpack.infra.customDashboards.selectDashboard.modalTitle.link', {
                defaultMessage: 'Select dashboard',
              })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup direction="column" justifyContent="center">
          <EuiComboBox
            isLoading={status === FETCH_STATUS.LOADING}
            isDisabled={status === FETCH_STATUS.LOADING || isEditMode}
            placeholder={i18n.translate(
              'xpack.infra.customDashboards.selectDashboard.placeholder',
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
                {i18n.translate('xpack.infra.customDashboard.addDashboard.useContextFilterLabel', {
                  defaultMessage: 'Filter by service and environment',
                })}{' '}
                <EuiToolTip
                  position="bottom"
                  content={i18n.translate(
                    'xpack.infra.customDashboard.addDashboard.useContextFilterLabel.tooltip',
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
            onChange={() => setAssetNameFiltersEnabled(!assetNameEnabled)}
            checked={assetNameEnabled}
          />
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="apmSelectDashboardCancelButton" onClick={onClose}>
          {i18n.translate('xpack.infra.customDashboards.selectDashboard.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton data-test-subj="apmSelectDashboardButton" onClick={onClickSave} fill>
          {isEditMode
            ? i18n.translate('xpack.infra.customDashboards.selectDashboard.edit', {
                defaultMessage: 'Save',
              })
            : i18n.translate('xpack.infra.customDashboards.selectDashboard.add', {
                defaultMessage: 'Link dashboard',
              })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

function getLinkSuccessToastLabels(dashboardName: string) {
  return {
    title: i18n.translate('xpack.infra.customDashboards.linkSuccess.toast.title', {
      defaultMessage: 'Added "{dashboardName}" dashboard',
      values: { dashboardName },
    }),
    text: i18n.translate('xpack.infra.customDashboards.linkSuccess.toast.text', {
      defaultMessage: 'Your dashboard is now visible in the service overview page.',
    }),
  };
}

function getEditSuccessToastLabels(dashboardName: string) {
  return {
    title: i18n.translate('xpack.infra.customDashboards.editSuccess.toast.title', {
      defaultMessage: 'Edited "{dashboardName}" dashboard',
      values: { dashboardName },
    }),
    text: i18n.translate('xpack.infra.customDashboards.editSuccess.toast.text', {
      defaultMessage: 'Your dashboard link have been updated',
    }),
  };
}
