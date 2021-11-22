/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiIconTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { ActionConnector } from '../../../../types';
import {
  deprecatedMessage,
  preconfiguredMessage,
  connectorDeprecatedMessage,
  checkConnectorIsDeprecated,
} from '../../../../common/connectors_selection';

// eslint-disable-next-line import/no-default-export
export { ServiceNowSelectableRowComponent as default };

function ServiceNowSelectableRowComponent({
  actionConnector,
}: {
  actionConnector: ActionConnector;
}) {
  const title = getTitle(actionConnector);

  return (
    <>
      <EuiFlexItem grow={false}>
        <span>{title}</span>
      </EuiFlexItem>
      {checkConnectorIsDeprecated(actionConnector) && (
        <EuiFlexItem grow={false}>
          <StyledIconTip
            aria-label={deprecatedTooltipTitle}
            size={'m'}
            type="alert"
            color="warning"
            content={connectorDeprecatedMessage}
            data-test-subj={`deprecated-connector-icon-${actionConnector?.id}`}
          />
        </EuiFlexItem>
      )}
    </>
  );
}

const getTitle = (connector: ActionConnector) => {
  let title = connector.name;

  if (connector.isPreconfigured) {
    title += ` ${preconfiguredMessage}`;
  }

  if (checkConnectorIsDeprecated(connector)) {
    title += ` ${deprecatedMessage}`;
  }

  return title;
};

const StyledIconTip = euiStyled(EuiIconTip)`
  margin-left: ${({ theme }) => theme.eui.euiSizeS}
  margin-bottom: 0 !important;
`;

const deprecatedTooltipTitle = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.deprecatedTooltipTitle',
  {
    defaultMessage: 'Deprecated connector',
  }
);
