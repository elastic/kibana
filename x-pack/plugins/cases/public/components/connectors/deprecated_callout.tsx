/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiCallOutProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const DEPRECATED_CONNECTOR_WARNING_TITLE = i18n.translate(
  'xpack.cases.connectors.serviceNow.deprecatedConnectorWarningTitle',
  {
    defaultMessage: 'This connector type is deprecated',
  }
);

const DEPRECATED_CONNECTOR_WARNING_DESC = i18n.translate(
  'xpack.cases.connectors.serviceNow.deprecatedConnectorWarningDesc',
  {
    defaultMessage: 'Update this connector, or create a new one.',
  }
);

interface Props {
  type?: EuiCallOutProps['color'];
}

const DeprecatedCalloutComponent: React.FC<Props> = ({ type = 'warning' }) => (
  <EuiCallOut
    title={DEPRECATED_CONNECTOR_WARNING_TITLE}
    color={type}
    iconType="alert"
    data-test-subj="deprecated-connector-warning-callout"
  >
    {DEPRECATED_CONNECTOR_WARNING_DESC}
  </EuiCallOut>
);
DeprecatedCalloutComponent.displayName = 'DeprecatedCallout';

export const DeprecatedCallout = React.memo(DeprecatedCalloutComponent);
