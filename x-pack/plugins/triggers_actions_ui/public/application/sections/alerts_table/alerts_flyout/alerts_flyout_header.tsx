/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTitle } from '@elastic/eui';
import { AlertsTableFlyoutBaseProps } from '../../../../types';

const SAMPLE_TITLE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.sampleTitle',
  {
    defaultMessage: 'Sample title',
  }
);

type Props = AlertsTableFlyoutBaseProps;
const AlertsFlyoutHeader = ({ alert }: Props) => {
  return (
    <EuiTitle size="m">
      <h2>{SAMPLE_TITLE_LABEL}</h2>
    </EuiTitle>
  );
};

// eslint-disable-next-line import/no-default-export
export default AlertsFlyoutHeader;
