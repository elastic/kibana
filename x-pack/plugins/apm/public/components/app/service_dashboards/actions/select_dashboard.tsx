/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSwitch,
  EuiModalBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DashboardsDropdownList } from '../dashboards_dropdown_list';

interface Props {
  onClose: () => void;
}

export function SelectDashboard({ onClose }: Props) {
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
        <DashboardsDropdownList />
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
        <EuiButton onClick={onClose} fill>
          {i18n.translate('xpack.apm.serviceDashboards.selectDashboard.add', {
            defaultMessage: 'Add dashboard',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
