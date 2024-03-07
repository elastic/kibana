/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPopover, EuiTextColor } from '@elastic/eui';

import { AggName } from '../../../../../../common/types/aggregations';

import { isGroupByDateHistogram, isGroupByHistogram, PivotGroupByConfig } from '../../../../common';

import { usePivotConfigOptions } from '../step_define/hooks/use_pivot_config';
import { useWizardActions } from '../../state_management/create_transform_store';

import { PopoverForm } from './popover_form';

interface Props {
  item: PivotGroupByConfig;
  otherAggNames: AggName[];
}

export const GroupByLabelForm: FC<Props> = ({ item, otherAggNames }) => {
  const { groupByOptionsData } = usePivotConfigOptions();
  const { pivotConfig: actions } = useWizardActions();
  const { deleteGroupBy, updateGroupBy } = actions;

  const [isPopoverVisible, setPopoverVisibility] = useState(false);

  function update(updateItem: PivotGroupByConfig) {
    updateGroupBy(updateItem);
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
            options={groupByOptionsData}
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
          onClick={() => deleteGroupBy(item.groupById)}
          data-test-subj="transformGroupByEntryDeleteButton"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
