/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues, useActions } from 'kea';

import { EuiPopover, EuiButtonIcon, EuiText, EuiContextMenu, EuiIcon } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EnginesListLogic } from '../engines/engines_list_logic';

import { EngineViewLogic } from './engine_view_logic';

export const EngineViewHeaderActions: React.FC = () => {
  const { engineData } = useValues(EngineViewLogic);

  const { openDeleteEngineModal } = useActions(EnginesListLogic);

  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const toggleActionsPopover = () => setIsActionsPopoverOpen((isPopoverOpen) => !isPopoverOpen);
  const closePopover = () => setIsActionsPopoverOpen(false);
  return (
    <>
      <EuiPopover
        anchorPosition="downRight"
        button={
          <EuiButtonIcon
            aria-label={i18n.translate(
              'xpack.enterpriseSearch.content.engine.headerActions.actionsButton.ariaLabel',
              {
                defaultMessage: 'Engine actions menu button',
              }
            )}
            onClick={toggleActionsPopover}
            iconType="boxesVertical"
          />
        }
        isOpen={isActionsPopoverOpen}
        panelPaddingSize="xs"
        closePopover={closePopover}
        display="block"
      >
        <EuiContextMenu
          size="s"
          initialPanelId={0}
          panels={[
            {
              id: 0,
              items: [
                {
                  icon: <EuiIcon type="trash" size="m" color="danger" />,
                  name: (
                    <EuiText color="danger">
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.engine.headerActions.delete',
                        { defaultMessage: 'Delete this engine' }
                      )}
                    </EuiText>
                  ),
                  onClick: () => {
                    if (engineData) {
                      openDeleteEngineModal(engineData);
                    }
                  },
                  size: 's',
                },
              ],
            },
          ]}
        />
      </EuiPopover>
    </>
  );
};
