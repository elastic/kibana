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
  PivotGroupByConfigDict,
} from '../../common';

import { PopoverForm } from './popover_form';

interface Props {
  item: PivotGroupByConfig;
  otherAggNames: AggName[];
  options: PivotGroupByConfigDict;
  deleteHandler(l: string): void;
  onChange(item: PivotGroupByConfig): void;
}

export const GroupByLabelForm: React.SFC<Props> = ({
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
      <EuiFlexItem className="mlGroupByLabel--text">
        <span className="eui-textTruncate">{item.aggName}</span>
      </EuiFlexItem>
      {interval !== undefined && (
        <EuiFlexItem grow={false} className="mlGroupByLabel--text mlGroupByLabel--interval">
          <EuiTextColor color="subdued" className="eui-textTruncate">
            {interval}
          </EuiTextColor>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false} className="mlGroupByLabel--button">
        <EuiPopover
          id="mlIntervalFormPopover"
          ownFocus
          button={
            <EuiButtonIcon
              aria-label={i18n.translate(
                'xpack.ml.dataframe.groupByLabelForm.editIntervalAriaLabel',
                {
                  defaultMessage: 'Edit interval',
                }
              )}
              size="s"
              iconType="pencil"
              onClick={() => setPopoverVisibility(!isPopoverVisible)}
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
      <EuiFlexItem grow={false} className="mlGroupByLabel--button">
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.ml.dataframe.groupByLabelForm.deleteItemAriaLabel', {
            defaultMessage: 'Delete item',
          })}
          size="s"
          iconType="cross"
          onClick={() => deleteHandler(item.aggName)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
