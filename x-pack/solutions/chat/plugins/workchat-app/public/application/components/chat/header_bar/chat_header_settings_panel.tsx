/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiButtonIcon, EuiContextMenu, EuiPopover, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConnectors } from '../../../hooks/use_connectors';

interface ChatHeaderSettingsPanel {
  connectorId: string | undefined;
  onConnectorChange: (connectorId: string) => void;
}

export const ChatHeaderSettingsPanel: React.FC<ChatHeaderSettingsPanel> = ({
  connectorId,
  onConnectorChange,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const { connectors } = useConnectors();
  const contextMenuPopoverId = useGeneratedHtmlId({ prefix: 'menuPopover' });

  const [lastSelectedConnectorId, setLastSelectedConnectorId] = useLocalStorage<string>(
    'workchat.lastSelectedConnectorId'
  );

  useEffect(() => {
    if (connectors.length && !connectorId) {
      onConnectorChange(lastSelectedConnectorId ?? connectors[0].connectorId);
    }
  }, [connectorId, connectors, onConnectorChange, lastSelectedConnectorId]);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const button = (
    <EuiButtonIcon
      color="text"
      display="base"
      size="m"
      iconType="controlsHorizontal"
      iconSize="m"
      onClick={onButtonClick}
    />
  );

  const panels = useMemo(() => {
    return [
      {
        id: 0,
        title: i18n.translate('workchatApp.chat.headerBar.connectorList.connectorsLabel', {
          defaultMessage: 'Connectors',
        }),
        items: connectors.map((connector) => {
          return {
            name: connector.name,
            icon: connector.connectorId === connectorId ? 'check' : 'empty',
            onClick: () => {
              onConnectorChange(connector.connectorId);
              setLastSelectedConnectorId(connector.connectorId);
            },
          };
        }),
      },
    ];
  }, [connectors, connectorId, onConnectorChange, setLastSelectedConnectorId]);

  return (
    <EuiPopover
      id={contextMenuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
