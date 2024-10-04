/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import {
  EuiListGroup,
  EuiPopover,
  EuiLink,
  EuiText,
  EuiIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useLoadActionTypes } from '@kbn/elastic-assistant/impl/connectorland/use_load_action_types';
import { ConnectorAddModal } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { ActionType } from '@kbn/actions-plugin/server';
import { useKibana } from '../../../../../../../common/lib/kibana';

interface CreateConnectorPopoverProps {
  onConnectorSaved: () => void;
}

const AllowedActionTypeIds = ['.bedrock', '.gen-ai', '.gemini'];

export const CreateConnectorPopover = React.memo<CreateConnectorPopoverProps>(
  ({ onConnectorSaved }) => {
    const [isOpen, setIsPopoverOpen] = useState(false);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);
    const {
      http,
      triggersActionsUi: { actionTypeRegistry },
      notifications: { toasts },
    } = useKibana().services;

    const onButtonClick = () => setIsPopoverOpen((isPopoverOpen) => !isPopoverOpen);

    const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);
    const onModalClose = useCallback(() => {
      setSelectedActionType(null);
      closePopover();
    }, [closePopover]);

    const { data } = useLoadActionTypes({ http, toasts });

    const actionTypes = useMemo(() => {
      if (AllowedActionTypeIds && data) {
        return data.filter((actionType) => AllowedActionTypeIds.includes(actionType.id));
      }
      return data;
    }, [data]);

    if (!actionTypes) {
      return <EuiLoadingSpinner />;
    }

    return (
      <>
        <EuiPopover
          className={css`
            width: fit-content;
          `}
          button={
            <EuiText size="s">
              <EuiLink data-test-subj="createConnectorPopoverButton" onClick={onButtonClick}>
                {'Create new connector'}
              </EuiLink>
            </EuiText>
          }
          isOpen={isOpen}
          closePopover={closePopover}
          data-test-subj="createConnectorPopover"
        >
          <EuiListGroup
            flush
            data-test-subj="connectorSetupCompressed"
            listItems={actionTypes.map((actionType) => ({
              id: actionType.id,
              label: actionType.name,
              size: 's',
              icon: (
                <EuiIcon
                  size="l"
                  color="text"
                  type={actionTypeRegistry.get(actionType.id).iconClass}
                />
              ),
              isDisabled: !actionType.enabled,
              // @ts-ignore
              onClick: () => setSelectedActionType(actionType),
            }))}
          />
        </EuiPopover>
        {selectedActionType && (
          <ConnectorAddModal
            actionTypeRegistry={actionTypeRegistry}
            // @ts-ignore
            actionType={selectedActionType}
            onClose={onModalClose}
            postSaveEventHandler={onConnectorSaved}
          />
        )}
      </>
    );
  }
);
CreateConnectorPopover.displayName = 'CreateConnectorPopover';
