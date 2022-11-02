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
  EuiFlexGroup,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Indicator } from '../../../../../../common/types/indicator';
import { FilterInButtonIcon, FilterOutButtonIcon } from '../../../../query_bar';
import { AddToTimelineContextMenu } from '../../../../timeline';
import { fieldAndValueValid, getIndicatorFieldAndValue } from '../../../utils';
import { CopyToClipboardContextMenu } from '../../copy_to_clipboard';

export const TIMELINE_BUTTON_TEST_ID = 'TimelineButton';
export const FILTER_IN_BUTTON_TEST_ID = 'FilterInButton';
export const FILTER_OUT_BUTTON_TEST_ID = 'FilterOutButton';
export const COPY_TO_CLIPBOARD_BUTTON_TEST_ID = 'CopyToClipboardButton';
export const POPOVER_BUTTON_TEST_ID = 'PopoverButton';

const MORE_ACTIONS_BUTTON_LABEL = i18n.translate('xpack.threatIntelligence.more-actions.popover', {
  defaultMessage: 'More actions',
});

interface IndicatorValueActions {
  /**
   * Indicator complete object.
   */
  indicator: Indicator;
  /**
   * Indicator field used for the filter in/out and add to timeline feature.
   */
  field: string;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

export const IndicatorValueActions: VFC<IndicatorValueActions> = ({
  indicator,
  field,
  'data-test-subj': dataTestSubj,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const { key, value } = getIndicatorFieldAndValue(indicator, field);
  if (!fieldAndValueValid(key, value)) {
    return null;
  }

  const filterInTestId = `${dataTestSubj}${FILTER_IN_BUTTON_TEST_ID}`;
  const filterOutTestId = `${dataTestSubj}${FILTER_OUT_BUTTON_TEST_ID}`;
  const timelineTestId = `${dataTestSubj}${TIMELINE_BUTTON_TEST_ID}`;
  const copyToClipboardTestId = `${dataTestSubj}${COPY_TO_CLIPBOARD_BUTTON_TEST_ID}`;
  const popoverTestId = `${dataTestSubj}${POPOVER_BUTTON_TEST_ID}`;

  const popoverItems = [
    <AddToTimelineContextMenu data={indicator} field={field} data-test-subj={timelineTestId} />,
    <CopyToClipboardContextMenu value={value as string} data-test-subj={copyToClipboardTestId} />,
  ];

  return (
    <EuiFlexGroup justifyContent="center" alignItems="center">
      <FilterInButtonIcon data={indicator} field={field} data-test-subj={filterInTestId} />
      <FilterOutButtonIcon data={indicator} field={field} data-test-subj={filterOutTestId} />
      <EuiPopover
        data-test-subj={popoverTestId}
        button={
          <EuiToolTip content={MORE_ACTIONS_BUTTON_LABEL}>
            <EuiButtonIcon
              aria-label={MORE_ACTIONS_BUTTON_LABEL}
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
    </EuiFlexGroup>
  );
};
