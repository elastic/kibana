/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useSyntheticsSettingsContext } from '../../../contexts';

export const AddMonitorLink = () => {
  const { basePath } = useSyntheticsSettingsContext();

  return (
    <EuiButtonEmpty
      data-test-subj="syntheticsAddMonitorLinkButton"
      href={`${basePath}/app/synthetics/add-monitor`}
    >
      {CREATE_NEW_MONITOR}
    </EuiButtonEmpty>
  );
};

const CREATE_NEW_MONITOR = i18n.translate('xpack.synthetics.monitorSummary.createNewMonitor', {
  defaultMessage: 'Create monitor',
});
