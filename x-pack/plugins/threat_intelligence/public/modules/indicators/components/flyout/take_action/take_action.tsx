/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, VFC } from 'react';
import { EuiButton, EuiContextMenuPanel, EuiPopover, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { canAddToBlockList } from '../../../../block_list/utils/can_add_to_block_list';
import { AddToBlockListContextMenu } from '../../../../block_list/components/add_to_block_list';
import { AddToNewCase } from '../../../../cases/components/add_to_new_case/add_to_new_case';
import { AddToExistingCase } from '../../../../cases/components/add_to_existing_case/add_to_existing_case';
import { Indicator } from '../../../../../../common/types/indicator';
import { InvestigateInTimelineContextMenu } from '../../../../timeline';

export const TAKE_ACTION_BUTTON_TEST_ID = 'tiIndicatorFlyoutTakeActionButton';
export const INVESTIGATE_IN_TIMELINE_CONTEXT_MENU_TEST_ID =
  'tiIndicatorFlyoutInvestigateInTimelineContextMenu';
export const ADD_TO_EXISTING_CASE_CONTEXT_MENU_TEST_ID =
  'tiIndicatorFlyoutAddToExistingCaseContextMenu';
export const ADD_TO_NEW_CASE_CONTEXT_MENU_TEST_ID = 'tiIndicatorFlyoutAddToNewCaseContextMenu';
export const ADD_TO_BLOCK_LIST_CONTEXT_MENU_TEST_ID = 'tiIndicatorFlyoutAddToBlockListContextMenu';
import {
  ADD_TO_EXISTING_CASE_TEST_ID,
  ADD_TO_NEW_CASE_TEST_ID,
  INVESTIGATE_IN_TIMELINE_TEST_ID,
  TAKE_ACTION_BUTTON_TEST_ID,
} from './test_ids';

export interface TakeActionProps {
  /**
   * Indicator object
   */
  indicator: Indicator;
}

/**
 * Component rendered at the bottom of the indicators flyout
 */
export const TakeAction: VFC<TakeActionProps> = ({ indicator }) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const smallContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'smallContextMenuPopover',
  });

  const closePopover = () => {
    setPopover(false);
  };

  const indicatorValue: string | null = canAddToBlockList(indicator);
  const items = [
    <InvestigateInTimelineContextMenu
      data={indicator}
      onClick={closePopover}
      data-test-subj={INVESTIGATE_IN_TIMELINE_TEST_ID}
    />,
    <AddToExistingCase
      indicator={indicator}
      onClick={closePopover}
      data-test-subj={ADD_TO_EXISTING_CASE_TEST_ID}
    />,
    <AddToNewCase
      indicator={indicator}
      onClick={closePopover}
      data-test-subj={ADD_TO_NEW_CASE_TEST_ID}
    />,
    <AddToBlockListContextMenu
      data={indicatorValue}
      onClick={closePopover}
      data-test-subj={ADD_TO_BLOCK_LIST_CONTEXT_MENU_TEST_ID}
    />,
  ];

  const button = (
    <EuiButton iconType="arrowDown" iconSide="right" onClick={() => setPopover(!isPopoverOpen)}>
      <FormattedMessage
        id="xpack.threatIntelligence.indicators.flyout.take-action.button"
        defaultMessage="Take action"
      />
    </EuiButton>
  );

  return (
    <EuiPopover
      id={smallContextMenuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      data-test-subj={TAKE_ACTION_BUTTON_TEST_ID}
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
};
