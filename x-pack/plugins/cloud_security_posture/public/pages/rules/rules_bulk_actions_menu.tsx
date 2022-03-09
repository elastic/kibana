/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiContextMenuPanel, EuiContextMenuItem, EuiPopover, EuiButtonEmpty } from '@elastic/eui';
import * as TEST_SUBJECTS from './test_subjects';
import * as TEXT from './translations';

interface RulesBulkActionsMenuProps {
  items: ReadonlyArray<React.ComponentProps<typeof EuiContextMenuItem>>;
}

export const RulesBulkActionsMenu = ({ items }: RulesBulkActionsMenuProps) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const onButtonClick = () => setPopover(!isPopoverOpen);
  const closePopover = () => setPopover(false);

  const panelItems = items.map((item, i) => (
    <EuiContextMenuItem
      {...item}
      key={i}
      onClick={(e) => {
        closePopover();
        item.onClick?.(e);
      }}
    />
  ));

  const button = (
    <EuiButtonEmpty
      iconType={'arrowDown'}
      onClick={onButtonClick}
      data-test-subj={TEST_SUBJECTS.CSP_RULES_TABLE_BULK_MENU_BUTTON}
    >
      {TEXT.BULK_ACTIONS}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s" items={panelItems} />
    </EuiPopover>
  );
};
