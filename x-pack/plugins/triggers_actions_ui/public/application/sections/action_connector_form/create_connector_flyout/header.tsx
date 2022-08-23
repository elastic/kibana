/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiBadge,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiFlyoutHeader,
  IconType,
  EuiSpacer,
  EuiBetaBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getConnectorFeatureName } from '@kbn/actions-plugin/common';
import { betaBadgeProps } from '../beta_badge_props';

interface Props {
  icon?: IconType | null;
  actionTypeName?: string | null;
  actionTypeMessage?: string | null;
  featureIds?: string[] | null;
  isExperimental?: boolean;
}

const FlyoutHeaderComponent: React.FC<Props> = ({
  icon,
  actionTypeName,
  actionTypeMessage,
  featureIds,
  isExperimental,
}) => {
  return (
    <EuiFlyoutHeader hasBorder data-test-subj="create-connector-flyout-header">
      <EuiFlexGroup gutterSize="m" alignItems="center">
        {icon ? (
          <EuiFlexItem grow={false} data-test-subj="create-connector-flyout-header-icon">
            <EuiIcon type={icon} size="xl" />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          {actionTypeName && actionTypeMessage ? (
            <>
              <EuiFlexGroup gutterSize="s" justifyContent="center" alignItems="center">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3 id="flyoutTitle">
                      <FormattedMessage
                        defaultMessage="{actionTypeName} connector"
                        id="xpack.triggersActionsUI.sections.addConnectorForm.flyoutTitle"
                        values={{
                          actionTypeName,
                        }}
                      />
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
                {actionTypeName && isExperimental && (
                  <EuiFlexItem grow={false}>
                    <EuiBetaBadge
                      label={betaBadgeProps.label}
                      tooltipContent={betaBadgeProps.tooltipContent}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              <EuiText size="s" color="subdued">
                {actionTypeMessage}
              </EuiText>
              {featureIds && featureIds.length > 0 && (
                <>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup
                    data-test-subj="create-connector-flyout-header-availability"
                    wrap
                    responsive={false}
                    gutterSize="xs"
                    alignItems="center"
                  >
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.addConnectorForm.flyoutHeaderAvailability"
                      defaultMessage="Availability:"
                    />{' '}
                    {featureIds.map((featureId: string) => (
                      <EuiFlexItem grow={false} key={featureId}>
                        <EuiBadge color="default">{getConnectorFeatureName(featureId)}</EuiBadge>
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </>
              )}
            </>
          ) : (
            <EuiTitle size="s">
              <h3 id="selectConnectorFlyoutTitle">
                <FormattedMessage
                  defaultMessage="Select a connector"
                  id="xpack.triggersActionsUI.sections.addConnectorForm.selectConnectorFlyoutTitle"
                />
              </h3>
            </EuiTitle>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutHeader>
  );
};

export const FlyoutHeader: React.NamedExoticComponent<Props> = memo(FlyoutHeaderComponent);
