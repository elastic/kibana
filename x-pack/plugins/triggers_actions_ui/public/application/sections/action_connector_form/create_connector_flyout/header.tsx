/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiFlyoutHeader,
  IconType,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const FlyoutHeaderComponent: React.FC<{
  icon?: IconType | null;
  actionTypeName?: string | null;
  actionTypeMessage?: string | null;
}> = ({ icon, actionTypeName, actionTypeMessage }) => {
  return (
    <EuiFlyoutHeader hasBorder data-test-subj="create-connector-flyout-header">
      <EuiFlexGroup gutterSize="m" alignItems="center">
        {icon ? (
          <EuiFlexItem grow={false} data-test-subj="create-connector-flyout-header-icon">
            <EuiIcon type={icon} size="xl" />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          {actionTypeName && actionTypeMessage ? (
            <>
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
              <EuiText size="s" color="subdued">
                {actionTypeMessage}
              </EuiText>
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

export const FlyoutHeader = memo(FlyoutHeaderComponent);
