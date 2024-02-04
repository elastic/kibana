/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiButtonIcon, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';

export function ActionsMenu({
  connectors,
  onEditPrompt,
}: {
  connectors: UseGenAIConnectorsResult;
  onEditPrompt: () => void;
}) {
  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const panels = [
    {
      id: 0,
      title: 'Actions',
      items: [
        {
          name: `Connectors: ${connectors.selectedConnector}`,
          icon: 'wrench',
          panel: 1,
        },
        {
          name: 'Edit prompt',
          icon: 'documentEdit',
          onClick: () => {
            onEditPrompt();
            closePopover();
          },
        },
      ],
    },
    {
      id: 1,
      title: 'Connectors',
      items: connectors.connectors?.map((connector) => {
        return {
          name: connector.name,
          icon: connector.id === connectors.selectedConnector ? 'check' : undefined,
          onClick: () => {
            connectors.selectConnector(connector.id);
            closePopover();
          },
        };
      }),
    },
  ];

  const button = (
    <EuiButtonIcon
      data-test-subj="observabilityAiAssistantInsightActionsButtonIcon"
      iconType="boxesHorizontal"
      onClick={onButtonClick}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
}
