/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import {
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiLoadingSpinner,
  EuiText,
  EuiLink,
  EuiTextColor,
  useEuiBackgroundColor,
} from '@elastic/eui';
import {
  ConnectorAddModal,
  type ActionConnector,
} from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import { useLoadActionTypes } from '@kbn/elastic-assistant/impl/connectorland/use_load_action_types';
import type { ActionType } from '@kbn/actions-plugin/common';
import { css } from '@emotion/css';
import { useKibana } from '../../../../../../../common/lib/kibana';

const useConnectorCardsStyles = () => {
  const { euiTheme } = useEuiTheme();
  const backgroundColor = useEuiBackgroundColor('success');
  return {
    panel: css`
      position: relative;
      overflow: hidden;
      height: 160px;
      &.euiPanel:hover {
        background-color: ${euiTheme.colors.lightestShade};
      }
    `,
    selected: css`
      width: 100%;
      position: absolute;
      bottom: 0;
      left: 0;
      padding: 8px 0;
      background-color: ${backgroundColor};
    `,
  };
};

interface ConnectorCardsProps {
  connectors?: AIConnector[];
  onConnectorSaved?: (savedAction: ActionConnector) => void;
  onClose?: () => void;
  actionTypeIds?: string[];
}

export const ConnectorCards = React.memo<ConnectorCardsProps>(
  ({ connectors, onConnectorSaved, onClose, actionTypeIds }) => {
    const { panel, selected } = useConnectorCardsStyles();
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
      return actionTypeIds ? data?.filter(({ id }) => actionTypeIds.includes(id)) : data;
    }, [data, actionTypeIds]);

    if (!actionTypes) return <EuiLoadingSpinner />;

    return (
      <>
        <EuiFlexGroup gutterSize="s" data-test-subj="connectorSetupPage">
          {actionTypes.map((actionType) => (
            <EuiFlexItem key={actionType.id}>
              <EuiLink
                color="text"
                onClick={() => setSelectedActionType(actionType)}
                data-test-subj={`actionType-${actionType.id}`}
              >
                <EuiPanel hasShadow={false} hasBorder paddingSize="m" className={panel}>
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
                      <EuiIcon
                        size="xxl"
                        color="text"
                        type={actionTypeRegistry.get(actionType.id).iconClass}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiTextColor color="default">
                        <EuiText size="s">{actionType.name}</EuiText>
                      </EuiTextColor>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  {connectors?.some((connector) => connector.actionTypeId === actionType.id) && (
                    <EuiFlexGroup
                      direction="row"
                      justifyContent="center"
                      alignItems="center"
                      gutterSize="s"
                      className={selected}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiIcon color="success" type="check" name="check" size="s" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiTextColor color="success">
                          <EuiText size="xs">
                            <strong>{'Connected'}</strong>
                          </EuiText>
                        </EuiTextColor>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                </EuiPanel>
              </EuiLink>
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
