/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiBetaBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { ActionConnectorTableItem } from '../../../types';
import { useActionsConnectorsContext } from '../../context/actions_connectors_context';
import { PLUGIN } from '../../constants/plugin';

interface Props {
  initialConnector: ActionConnectorTableItem;
  flyoutVisible: boolean;
  setFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PreconfiguredConnectorFlyout = ({
  initialConnector,
  flyoutVisible,
  setFlyoutVisibility,
}: Props) => {
  const { actionTypeRegistry } = useActionsConnectorsContext();
  const closeFlyout = useCallback(() => setFlyoutVisibility(false), [setFlyoutVisibility]);
  if (!flyoutVisible) {
    return null;
  }

  const actionTypeModel = actionTypeRegistry.get(initialConnector.actionTypeId);

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionAddTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {actionTypeModel ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeModel.iconClass} size="m" />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="flyoutTitle">
                <FormattedMessage
                  defaultMessage="{connectorName}"
                  id="xpack.triggersActionsUI.sections.preconfiguredConnectorForm.flyoutTitle"
                  values={{ connectorName: initialConnector.name }}
                />
                &emsp;
                <EuiBetaBadge
                  label="Pre-configured"
                  tooltipContent={i18n.translate(
                    'xpack.triggersActionsUI.sections.preconfiguredConnectorForm.tooltipContent',
                    {
                      defaultMessage: 'This connector is preconfigured and not allowed to edit',
                    }
                  )}
                />
                &emsp;
                <EuiBetaBadge
                  label="Beta"
                  tooltipContent={i18n.translate(
                    'xpack.triggersActionsUI.sections.preconfiguredConnectorForm.betaBadgeTooltipContent',
                    {
                      defaultMessage:
                        '{pluginName} is in beta and is subject to change. The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features.',
                      values: {
                        pluginName: PLUGIN.getI18nName(i18n),
                      },
                    }
                  )}
                />
              </h3>
            </EuiTitle>
            <EuiText size="s">
              <FormattedMessage
                defaultMessage="{actionDescription}"
                id="xpack.triggersActionsUI.sections.preconfiguredConnectorForm.actionTypeDescription"
                values={{ actionDescription: actionTypeModel.selectMessage }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          {i18n.translate(
            'xpack.triggersActionsUI.sections.preconfiguredConnectorForm.descriptionText',
            {
              defaultMessage: 'This connector is readonly.',
            }
          )}
        </EuiText>
        <EuiLink href="https://www.elastic.co/guide" target="_blank">
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.preconfiguredConnectorForm.preconfiguredHelpLabel"
            defaultMessage="Learn more about pre-configured connectors."
          />
        </EuiLink>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout}>
              {i18n.translate(
                'xpack.triggersActionsUI.sections.preconfiguredConnectorForm.cancelButtonLabel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
