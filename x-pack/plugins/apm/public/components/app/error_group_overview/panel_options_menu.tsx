/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';
import React, { useState } from 'react';

export function PanelOptionsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleContextMenu = () => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  };
  const inspect = () => {
    toggleContextMenu();
    alert('inspect');
  };

  const button = (
    <EuiButtonIcon
      iconType="boxesHorizontal"
      color="text"
      className="embPanel__optionsMenuButton"
      aria-label={'todo'}
      onClick={toggleContextMenu}
      style={{ position: 'relative' }}
    />
  );
  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 'mainMenu',
      title: 'Options',
      items: [
        {
          name: 'Inspect',
          icon: 'inspect',
          onClick: inspect,
        },
      ],
    },
  ];
  return (
    <EuiPopover button={button} isOpen={isOpen}>
      <EuiContextMenu initialPanelId="mainMenu" panels={panels} />
    </EuiPopover>
  );
}
