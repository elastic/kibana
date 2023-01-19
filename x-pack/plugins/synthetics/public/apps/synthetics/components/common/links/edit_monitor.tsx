/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import { useSyntheticsSettingsContext } from '../../../contexts';

export const EditMonitorLink = () => {
  const { basePath } = useSyntheticsSettingsContext();

  const { monitorId } = useParams<{ monitorId: string }>();

  return (
    <EuiButton
      fill
      href={`${basePath}/app/synthetics/edit-monitor/${monitorId}`}
      iconType="pencil"
      iconSide="left"
    >
      {EDIT_MONITOR}
    </EuiButton>
  );
};

const EDIT_MONITOR = i18n.translate('xpack.synthetics.monitorSummary.editMonitor', {
  defaultMessage: 'Edit monitor',
});
