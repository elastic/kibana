/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const MonitorDetailsPanel = () => (
  <>
    <EuiDescriptionList type="responsiveColumn" style={{ maxWidth: '400px' }}>
      <EuiDescriptionListTitle>{ENABLED_LABEL}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        A videogame that I have spent way too much time on over the years.
      </EuiDescriptionListDescription>
      <EuiDescriptionListTitle>{MONITOR_TYPE_LABEL}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        The game that forced me to learn DOS.
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  </>
);

const ENABLED_LABEL = i18n.translate('xpack.synthetics.detailsPanel.monitorDetails.enabled', {
  defaultMessage: 'Enabled',
});

const MONITOR_TYPE_LABEL = i18n.translate(
  'xpack.synthetics.detailsPanel.monitorDetails.monitorType',
  {
    defaultMessage: 'Monitor type',
  }
);
