/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, VFC } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AddToBlockListContextMenu } from '../../../../../block_list/components/add_to_block_list';
import { AddToNewCase } from '../../../../../cases/components/add_to_new_case/add_to_new_case';
import { AddToExistingCase } from '../../../../../cases/components/add_to_existing_case/add_to_existing_case';
import { Indicator } from '../../../../../../../common/types/indicator';
import { canAddToBlockList } from '../../../../../block_list/utils/can_add_to_block_list';

export const MORE_ACTIONS_BUTTON_TEST_ID = 'tiIndicatorTableMoreActionsButton';
export const ADD_TO_EXISTING_CASE_CONTEXT_MENU_TEST_ID =
  'tiIndicatorTableAddToExistingCaseContextMenu';
export const ADD_TO_NEW_CASE_CONTEXT_MENU_TEST_ID = 'tiIndicatorTableAddToNewCaseContextMenu';
import { ADD_TO_EXISTING_TEST_ID, ADD_TO_NEW_CASE_TEST_ID, MORE_ACTIONS_TEST_ID } from './test_ids';

export const ADD_TO_BLOCK_LIST_CONTEXT_MENU_TEST_ID =
  'tiIndicatorsTableCellAddToBlockListContextMenu';

const BUTTON_LABEL = i18n.translate('xpack.threatIntelligence.indicator.table.moreActions', {
  defaultMessage: 'More actions',
});

export interface TakeActionProps {
  /**
   * Indicator object
   */
  indicator: Indicator;
}

/**
 * Component rendered in the action column.
 * Renders a ... icon button, with a dropdown.
 */
export const MoreActions: VFC<TakeActionProps> = ({ indicator }) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const smallContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'smallContextMenuPopover',
  });

  const closePopover = () => {
    setPopover(false);
  };

  const items = [
    <AddToExistingCase
      indicator={indicator}
      onClick={closePopover}
      data-test-subj={ADD_TO_EXISTING_TEST_ID}
    />,
    <AddToNewCase
      indicator={indicator}
      onClick={closePopover}
      data-test-subj={ADD_TO_NEW_CASE_TEST_ID}
    />,
    <AddToBlockListContextMenu
      data={canAddToBlockList(indicator)}
      onClick={closePopover}
      data-test-subj={ADD_TO_BLOCK_LIST_CONTEXT_MENU_TEST_ID}
    />,
  ];

  const button = (
    <EuiToolTip content={BUTTON_LABEL}>
      <EuiButtonIcon
        aria-label={BUTTON_LABEL}
        iconType="boxesHorizontal"
        iconSize="s"
        size="xs"
        onClick={() => setPopover((prevIsPopoverOpen) => !prevIsPopoverOpen)}
        style={{ height: '100%' }}
        data-test-subj={MORE_ACTIONS_TEST_ID}
      />
    </EuiToolTip>
  );

  return (
    <EuiPopover
      id={smallContextMenuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
};
