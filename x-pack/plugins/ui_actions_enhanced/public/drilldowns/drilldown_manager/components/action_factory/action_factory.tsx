/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

const txtDrilldownAction = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownForm.drilldownAction',
  {
    defaultMessage: 'Action',
  }
);

const txtGetMoreActions = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownForm.getMoreActionsLinkLabel',
  {
    defaultMessage: 'Get more actions',
  }
);

const txtBetaActionFactoryLabel = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownForm.betaActionLabel',
  {
    defaultMessage: `Beta`,
  }
);

const txtBetaActionFactoryTooltip = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownForm.betaActionTooltip',
  {
    defaultMessage: `This action is in beta and is subject to change. The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features. Please help us by reporting bugs or providing other feedback.`,
  }
);

const txtChangeButton = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownForm.changeButton',
  {
    defaultMessage: 'Change',
  }
);

const GET_MORE_ACTIONS_LINK = 'https://www.elastic.co/subscriptions';

const moreActions = (
  <EuiText size="s">
    <EuiLink
      href={GET_MORE_ACTIONS_LINK}
      target="_blank"
      external
      data-test-subj={'getMoreActionsLink'}
    >
      {txtGetMoreActions}
    </EuiLink>
  </EuiText>
);

export interface ActionFactoryProps {
  /** Action factory name. */
  name?: string;

  /** ID of EUI icon. */
  icon?: string;

  /** Whether the current drilldown type is in beta. */
  beta?: boolean;

  /** Whether to show "Get more actions" link to upgrade license. */
  showMoreLink?: boolean;

  /** On drilldown type change click. */
  onChange?: () => void;
}

export const ActionFactory: React.FC<ActionFactoryProps> = ({
  name,
  icon,
  beta,
  showMoreLink,
  onChange,
}) => {
  return (
    <EuiFormRow
      label={txtDrilldownAction}
      fullWidth={true}
      labelAppend={showMoreLink && moreActions}
    >
      <header>
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
          {!!icon && (
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} size="m" />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={true}>
            <EuiText>
              <h4>
                {name}{' '}
                {beta && (
                  <EuiBetaBadge
                    label={txtBetaActionFactoryLabel}
                    tooltipContent={txtBetaActionFactoryTooltip}
                  />
                )}
              </h4>
            </EuiText>
          </EuiFlexItem>
          {!!onChange && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" onClick={onChange}>
                {txtChangeButton}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </header>
    </EuiFormRow>
  );
};
