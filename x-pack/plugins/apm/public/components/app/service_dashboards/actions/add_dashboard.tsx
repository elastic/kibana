/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { SelectDashboard } from './select_dashboard';

export function AddDashboard() {
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <>
      <EuiButton
        data-test-subj="apmAddServiceDashboard"
        onClick={() => setIsModalVisible(true)}
      >
        {i18n.translate('xpack.apm.serviceDashboards.addButtonLabel', {
          defaultMessage: 'Link dashboard',
        })}
      </EuiButton>

      {isModalVisible && (
        <SelectDashboard onClose={() => setIsModalVisible(false)} />
      )}
    </>
  );
}
