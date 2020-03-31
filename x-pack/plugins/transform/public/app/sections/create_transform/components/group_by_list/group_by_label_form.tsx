/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPopover, EuiTextColor } from '@elastic/eui';

import {
  AggName,
  isGroupByDateHistogram,
  isGroupByHistogram,
  PivotGroupByConfig,
  PivotGroupByConfigWithUiSupportDict,
} from '../../../../common';

import { PopoverForm } from './popover_form';

interface Props {
  item: PivotGroupByConfig;
  otherAggNames: AggName[];
  options: PivotGroupByConfigWithUiSupportDict;
  deleteHandler(l: string): void;
  onChange(item: PivotGroupByConfig): void;
}

export const GroupByLabelForm: React.FC<Props> = ({
  deleteHandler,
  item,
  otherAggNames,
  onChange,
  options,
}) => {
  const [isPopoverVisible, setPopoverVisibility] = useState(false);

  function update(updateItem: PivotGroupByConfig) {
    onChange({ ...updateItem });
    setPopoverVisibility(false);
  }

  let interval: string | undefined;

  if (isGroupByDateHistogram(item)) {
    interval = item.calendar_interval;
  } else if (isGroupByHistogram(item)) {
    interval = item.interval;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem className="transform__GroupByLabel--text">
        <span className="eui-textTruncate" data-test-subj="transformGroupByEntryLabel">
          {item.aggName}
        </span>
      </EuiFlexItem>
      {interval !== undefined && (
        <EuiFlexItem
          grow={false}
          className="transform__GroupByLabel--text transform__GroupByLabel--interval"
        >
          <EuiTextColor
            color="subdued"
            className="eui-textTruncate"
            data-test-subj="transformGroupByEntryIntervalLabel"
          >
            {interval}
          </EuiTextColor>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false} className="transform__GroupByLabel--button">
        <EuiPopover
          id="transformIntervalFormPopover"
          ownFocus
          button={
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.transform.groupByLabelForm.editIntervalAriaLabel', {
                defaultMessage: 'Edit interval',
              })}
              size="s"
              iconType="pencil"
              onClick={() => setPopoverVisibility(!isPopoverVisible)}
              data-test-subj="transformGroupByEntryEditButton"
            />
          }
          isOpen={isPopoverVisible}
          closePopover={() => setPopoverVisibility(false)}
        >
          <PopoverForm
            defaultData={item}
            onChange={update}
            otherAggNames={otherAggNames}
            options={options}
          />
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false} className="transform__GroupByLabel--button">
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.transform.groupByLabelForm.deleteItemAriaLabel', {
            defaultMessage: 'Delete item',
          })}
          size="s"
          iconType="cross"
          onClick={() => deleteHandler(item.aggName)}
          data-test-subj="transformGroupByEntryDeleteButton"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
