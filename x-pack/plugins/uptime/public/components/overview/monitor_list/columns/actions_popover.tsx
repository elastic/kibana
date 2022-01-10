/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { PLAYGROUND_ROUTE } from '../../../../../common/constants';
import { addSession } from '../../../../state/playground/playground';

export const ActionsPopover = ({ item }: { item: any }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>();
  const history = useHistory();

  const closePopover = () => {
    setIsPopoverOpen(false);
  };
  const togglePopover = () => {
    setIsPopoverOpen(true);
  };

  const dispatch = useDispatch();

  return (
    <EuiPopover
      id={`monitor-list-actions`}
      button={
        <EuiButtonIcon
          aria-label="Actions"
          iconType="boxesVertical"
          size="s"
          color="text"
          onClick={() => togglePopover()}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => closePopover()}
      panelPaddingSize="none"
      anchorPosition="leftCenter"
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="A"
            onClick={() => {
              closePopover();
            }}
          >
            Trigger
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
