/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { type AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import type { IconType } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiLoadingSpinner,
  EuiText,
  EuiLink,
  EuiTextColor,
  EuiBadge,
  EuiSpacer,
} from '@elastic/eui';
import { ConnectorAddModal } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import { useLoadActionTypes } from '@kbn/elastic-assistant/impl/connectorland/use_load_action_types';
import type { ActionType } from '@kbn/actions-plugin/common';
import { css } from '@emotion/css';
import { useKibana } from '../../../../../../../common/lib/kibana';
import { CreateConnectorPopover } from '../create_connector_popover/create_connector_popover';
import { AllowedActionTypeIds } from '../../constants';
import { useConnectorCardsStyles } from './connector_cards.styles';

interface ConnectorCardsProps {
  connectors?: AIConnector[];
  onConnectorSaved: () => void;
  onClose?: () => void;
}

export const ConnectorCards = React.memo<ConnectorCardsProps>(
  ({ connectors, onConnectorSaved, onClose }) => {
    const connectorCardsStyles = useConnectorCardsStyles();
    const {
      http,
      triggersActionsUi: { actionTypeRegistry },
      notifications: { toasts },
    } = useKibana().services;

    const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);
    const onModalClose = useCallback(() => {
      setSelectedActionType(null);
      onClose?.();
    }, [onClose]);

    const { data } = useLoadActionTypes({ http, toasts });

    const actionTypes = useMemo(() => {
      return data?.filter(({ id }) => AllowedActionTypeIds.includes(id));
    }, [data]);

    if (!actionTypes || !connectors) return <EuiLoadingSpinner />;

    if (connectors.length > 0) {
      return (
        <>
          <EuiFlexGroup wrap>
            {connectors?.map((connector) => (
              <EuiFlexItem
                grow={false}
                className={css`
                  width: 30%;
                `}
              >
                <EuiPanel hasShadow={false} hasBorder paddingSize="m">
                  <EuiFlexGroup
                    alignItems="center"
                    justifyContent="center"
                    className={css`
                      height: 100%;
                    `}
                  >
                    <EuiFlexItem>
                      <EuiText size="s">{connector.name}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        {actionTypeRegistry.get(connector.actionTypeId).actionTypeTitle}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer />
          <CreateConnectorPopover onConnectorSaved={onConnectorSaved} />
        </>
      );
    }

    return (
      <>
        <EuiFlexGroup gutterSize="s" data-test-subj="connectorSetupPage">
          {actionTypes.map((actionType) => (
            <EuiFlexItem key={actionType.id} className={connectorCardsStyles}>
              <ConnectorCardSelector
                setSelectedActionType={setSelectedActionType}
                actionType={actionType}
                iconType={actionTypeRegistry.get(actionType.id).iconClass}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        {selectedActionType && (
          <ConnectorAddModal
            actionTypeRegistry={actionTypeRegistry}
            actionType={selectedActionType}
            onClose={onModalClose}
            postSaveEventHandler={onConnectorSaved}
          />
        )}
      </>
    );
  }
);
ConnectorCards.displayName = 'ConnectorCards';

const ConnectorCardSelector = React.memo<{
  setSelectedActionType: (actionType: ActionType) => void;
  actionType: ActionType;
  iconType: IconType;
}>(({ setSelectedActionType, actionType, iconType }) => {
  return (
    <EuiLink
      color="text"
      onClick={() => setSelectedActionType(actionType)}
      data-test-subj={`actionType-${actionType.id}`}
    >
      <EuiPanel hasShadow={false} hasBorder paddingSize="m" className="connectorSelectorPanel">
        <EuiFlexGroup
          direction="column"
          alignItems="center"
          justifyContent="center"
          gutterSize="s"
          className={css`
            height: 100%;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon size="xxl" color="text" type={iconType} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTextColor color="default">
              <EuiText size="s">{actionType.name}</EuiText>
            </EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiLink>
  );
});

ConnectorCardSelector.displayName = 'ConnectorCardSelector';
