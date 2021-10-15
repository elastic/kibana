/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiIconTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { ActionConnector } from '../../../types';
import { isDeprecatedConnector } from '../common/connectors';

export const DeprecatedConnectorIcon = React.memo(DeprecatedConnectorComponent);

function DeprecatedConnectorComponent({ connector }: { connector: ActionConnector }) {
  return (
    <>
      {isDeprecatedConnector(connector) && (
        <EuiFlexItem grow={false}>
          <StyledIconTip
            aria-label={deprecatedTooltipTitle}
            size={'m'}
            type="alert"
            color="warning"
            title={deprecatedTooltipTitle}
            content={deprecatedTooltipContent}
            data-test-subj={`deprecated-connector-icon-${connector.id}`}
          />
        </EuiFlexItem>
      )}
    </>
  );
}

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

const deprecatedTooltipContent = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.deprecatedTooltipContent',
  {
    defaultMessage: 'Please update your connector',
  }
);
