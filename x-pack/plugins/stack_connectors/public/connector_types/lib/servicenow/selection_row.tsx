/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiIconTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { connectorDeprecatedMessage } from '@kbn/triggers-actions-ui-plugin/public';

// eslint-disable-next-line import/no-default-export
export { ServiceNowSelectableRowIcon as default };

export function ServiceNowSelectableRowIcon({
  actionConnector,
}: {
  actionConnector: ActionConnector;
}) {
  return (
    <EuiIconTip
      aria-label={deprecatedTooltipTitle}
      type="alert"
      color="warning"
      content={connectorDeprecatedMessage}
      data-test-subj={`deprecated-connector-icon-${actionConnector.id}`}
      anchorClassName={'euiFormControlLayout__prepend'}
    />
  );
}

const deprecatedTooltipTitle = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.deprecatedTooltipTitle',
  {
    defaultMessage: 'Deprecated connector',
  }
);
