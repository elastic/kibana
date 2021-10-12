/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiCallOutProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const LEGACY_CONNECTOR_WARNING_TITLE = i18n.translate(
  'xpack.cases.connectors.serviceNow.legacyConnectorWarningTitle',
  {
    defaultMessage: 'Deprecated connector type',
  }
);

const LEGACY_CONNECTOR_WARNING_DESC = i18n.translate(
  'xpack.cases.connectors.serviceNow.legacyConnectorWarningDesc',
  {
    defaultMessage:
      'This connector type is deprecated. Create a new connector or update this connector',
  }
);

interface Props {
  type?: EuiCallOutProps['color'];
}

const DeprecatedCalloutComponent: React.FC<Props> = ({ type = 'warning' }) => (
  <EuiCallOut
    title={LEGACY_CONNECTOR_WARNING_TITLE}
    color={type}
    iconType="alert"
    data-test-subj="legacy-connector-warning-callout"
  >
    {LEGACY_CONNECTOR_WARNING_DESC}
  </EuiCallOut>
);

export const DeprecatedCallout = React.memo(DeprecatedCalloutComponent);
