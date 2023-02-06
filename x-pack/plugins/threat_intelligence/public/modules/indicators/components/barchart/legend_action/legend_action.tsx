/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, VFC } from 'react';
import { EuiButtonIcon, EuiContextMenuPanel, EuiPopover, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CopyToClipboardContextMenu } from '../../copy_to_clipboard';
import { FilterInContextMenu, FilterOutContextMenu } from '../../../../query_bar';
import { AddToTimelineContextMenu } from '../../../../timeline';
import {
  COPY_TO_CLIPBOARD_BUTTON_TEST_ID,
  FILTER_IN_BUTTON_TEST_ID,
  FILTER_OUT_BUTTON_TEST_ID,
  POPOVER_BUTTON_TEST_ID,
  TIMELINE_BUTTON_TEST_ID,
} from './test_ids';

const BUTTON_LABEL = i18n.translate('xpack.threatIntelligence.indicator.barChart.popover', {
  defaultMessage: 'More actions',
});

export interface IndicatorBarchartLegendActionProps {
  /**
   * Indicator
   */
  data: string;
  /**
   * Indicator field selected in the IndicatorFieldSelector component, passed to the {@link AddToTimelineContextMenu} to populate the timeline.
   */
  field: string;
}

export const IndicatorBarchartLegendAction: VFC<IndicatorBarchartLegendActionProps> = ({
  data,
  field,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const popoverItems = [
    <FilterInContextMenu data={data} field={field} data-test-subj={FILTER_IN_BUTTON_TEST_ID} />,
    <FilterOutContextMenu data={data} field={field} data-test-subj={FILTER_OUT_BUTTON_TEST_ID} />,
    <AddToTimelineContextMenu data={data} field={field} data-test-subj={TIMELINE_BUTTON_TEST_ID} />,
    <CopyToClipboardContextMenu value={data} data-test-subj={COPY_TO_CLIPBOARD_BUTTON_TEST_ID} />,
  ];

  return (
    <EuiPopover
      data-test-subj={POPOVER_BUTTON_TEST_ID}
      button={
        <EuiToolTip content={BUTTON_LABEL}>
          <EuiButtonIcon
            aria-label={BUTTON_LABEL}
            iconType="boxesHorizontal"
            iconSize="s"
            size="xs"
            onClick={() => setPopover((prevIsPopoverOpen) => !prevIsPopoverOpen)}
            style={{ height: '100%' }}
          />
        </EuiToolTip>
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
