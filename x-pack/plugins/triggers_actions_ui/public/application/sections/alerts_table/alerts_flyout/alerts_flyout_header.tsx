/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { get } from 'lodash';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { EuiTitle } from '@elastic/eui';
import { AlertsTableFlyoutBaseProps } from '../../../../types';

type Props = AlertsTableFlyoutBaseProps;
const AlertsFlyoutHeader = ({ alert }: Props) => {
  return (
    <EuiTitle size="m">
      <h2>{get(alert, ALERT_RULE_NAME)}</h2>
    </EuiTitle>
  );
};

// eslint-disable-next-line import/no-default-export
export default AlertsFlyoutHeader;
