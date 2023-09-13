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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import { useDashboardFetcher } from '../../../../hooks/use_dashboards_fetcher';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmParams } from '../../../../hooks/use_apm_params';

interface Props {
  onClose: () => void;
}

export function SelectDashboard({ onClose }: Props) {
  const {
    core: { notifications },
  } = useApmPluginContext();

  const { data, status } = useDashboardFetcher();
  const [selectedDashboard, setSelectedDashboard] = useState([]);

  const {
    path: { serviceName },
  } = useApmParams('/services/{serviceName}/dashboards');

  console.log('selectedDashboard', selectedDashboard);

  // TODO need to refetch and not reload
  const reloadServiceDashboards = useCallback(() => {
    window.location.reload();
  }, []);

  const onSave = useCallback(
    async function () {
      const [newDashboard] = selectedDashboard;
      // setIsLoading(true);
      try {
        await callApmApi('POST /internal/apm/service-dashboard', {
          params: {
            body: {
              dashboardTitle: newDashboard.label,
              dashboardSavedObjectId: newDashboard.value,
              kuery: '',
              environment: '',
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
    [selectedDashboard, notifications.toasts]
  );

  return (
    <EuiModal onClose={onClose} data-test-subj="apmSelectServiceDashboard">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {' '}
          {i18n.translate(
            'xpack.apm.serviceDashboards.selectDashboard.modalTitle',
            {
              defaultMessage: 'Select dashboard',
            }
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiComboBox
          isLoading={status === FETCH_STATUS.LOADING}
          isDisabled={status === FETCH_STATUS.LOADING}
          placeholder={i18n.translate(
            'xpack.apm.serviceDashboards.selectDashboard.placeholder',
            {
              defaultMessage: 'Select dasbboard',
            }
          )}
          singleSelection={{ asPlainText: true }}
          options={data?.map((dashboardItem) => ({
            label: dashboardItem.attributes.title,
            value: dashboardItem.id,
          }))}
          selectedOptions={selectedDashboard}
          onChange={(newSelection) => setSelectedDashboard(newSelection)}
          isClearable={true}
        />

        <EuiSwitch
          label="Filter by service and environment"
          onChange={() => console.log('r')}
          checked={false}
          compressed
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={onClose} fill>
          {i18n.translate(
            'xpack.apm.serviceDashboards.selectDashboard.cancel',
            {
              defaultMessage: 'Cancel',
            }
          )}
        </EuiButton>
        <EuiButton onClick={onSave} fill>
          {i18n.translate('xpack.apm.serviceDashboards.selectDashboard.add', {
            defaultMessage: 'Add dashboard',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
