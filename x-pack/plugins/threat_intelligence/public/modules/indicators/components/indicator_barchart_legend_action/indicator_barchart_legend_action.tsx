/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, VFC } from 'react';
import { EuiButtonIcon, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { ComponentType } from '../../../../../common/types/component_type';
import { FilterIn } from '../../../query_bar/components/filter_in';
import { FilterOut } from '../../../query_bar/components/filter_out';
import { AddToTimeline } from '../../../timeline/components/add_to_timeline';

export const POPOVER_BUTTON_TEST_ID = 'tiBarchartPopoverButton';
export const TIMELINE_BUTTON_TEST_ID = 'tiBarchartTimelineButton';
export const FILTER_IN_BUTTON_TEST_ID = 'tiBarchartFilterInButton';
export const FILTER_OUT_BUTTON_TEST_ID = 'tiBarchartFilterOutButton';

export interface IndicatorBarchartLegendActionProps {
  /**
   * Indicator
   */
  data: string;
  /**
   * Indicator field selected in the IndicatorFieldSelector component, passed to the {@link AddToTimeline} to populate the timeline.
   */
  field: string;
}

export const IndicatorBarchartLegendAction: VFC<IndicatorBarchartLegendActionProps> = ({
  data,
  field,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const popoverItems = [
    <FilterIn
      data={data}
      field={field}
      type={ComponentType.ContextMenu}
      data-test-subj={FILTER_IN_BUTTON_TEST_ID}
    />,
    <FilterOut
      data={data}
      field={field}
      type={ComponentType.ContextMenu}
      data-test-subj={FILTER_OUT_BUTTON_TEST_ID}
    />,
    <AddToTimeline
      data={data}
      field={field}
      type={ComponentType.ContextMenu}
      data-test-subj={TIMELINE_BUTTON_TEST_ID}
    />,
  ];

  return (
    <EuiPopover
      data-test-subj={POPOVER_BUTTON_TEST_ID}
      button={
        <EuiButtonIcon
          iconType="boxesHorizontal"
          iconSize="s"
          size="xs"
          onClick={() => setPopover(!isPopoverOpen)}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setPopover(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s" items={popoverItems} />
    </EuiPopover>
  );
};
