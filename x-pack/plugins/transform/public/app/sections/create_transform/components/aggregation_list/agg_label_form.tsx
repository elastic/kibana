/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useContext, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButtonIcon,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiTextColor,
} from '@elastic/eui';

import {
  AggName,
  isPivotAggsConfigWithUiSupport,
  PivotAggsConfig,
  PivotAggsConfigWithUiSupportDict,
} from '../../../../common';

import { PopoverForm } from './popover_form';
import { isPivotAggsWithExtendedForm } from '../../../../common/pivot_aggs';
import { DropDown } from '../aggregation_dropdown';
import { AggListForm } from './list_form';
import { PivotConfigurationContext } from '../pivot_configuration/pivot_configuration';

interface Props {
  item: PivotAggsConfig;
  otherAggNames: AggName[];
  options: PivotAggsConfigWithUiSupportDict;
  deleteHandler(l: AggName): void;
  onChange(item: PivotAggsConfig): void;
  aggOptions: EuiComboBoxOptionOption[];
}

export const AggLabelForm: React.FC<Props> = ({
  deleteHandler,
  item,
  otherAggNames,
  onChange,
  options,
  aggOptions,
}) => {
  const [isPopoverVisible, setPopoverVisibility] = useState(
    isPivotAggsWithExtendedForm(item) && !item.isValid()
  );

  const { actions } = useContext(PivotConfigurationContext)!;

  function update(updateItem: PivotAggsConfig) {
    onChange({ ...updateItem });
    setPopoverVisibility(false);
  }

  const sugAggAddHandler = useCallback(
    (d: EuiComboBoxOptionOption[]) => {
      actions.addSubAggregation(item, d);
    },
    [actions, item]
  );

  const sugAggUpdateHandler = useCallback(
    (prevSubItemName: string, subItem: PivotAggsConfig) => {
      actions.updateSubAggregation(item, prevSubItemName, subItem);
    },
    [actions, item]
  );

  const helperText = isPivotAggsWithExtendedForm(item) && item.helperText && item.helperText();

  const isSubAggSupported =
    isPivotAggsConfigWithUiSupport(item) &&
    item.isSubAggsSupported &&
    (isPivotAggsWithExtendedForm(item) ? item.isValid() : true);

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem className="transform__AggregationLabel--text">
          <span className="eui-textTruncate" data-test-subj="transformAggregationEntryLabel">
            {item.aggName}
          </span>
        </EuiFlexItem>
        {helperText && (
          <EuiFlexItem grow={false}>
            <EuiTextColor
              color="subdued"
              className="eui-textTruncate"
              data-test-subj="transformAggHelperText"
            >
              {helperText}
            </EuiTextColor>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false} className="transform__GroupByLabel--button">
          <EuiPopover
            id="transformFormPopover"
            ownFocus
            button={
              <EuiButtonIcon
                aria-label={i18n.translate('xpack.transform.aggLabelForm.editAggAriaLabel', {
                  defaultMessage: 'Edit aggregation',
                })}
                size="s"
                iconType="pencil"
                onClick={() => setPopoverVisibility(!isPopoverVisible)}
                data-test-subj="transformAggregationEntryEditButton"
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
            aria-label={i18n.translate('xpack.transform.aggLabelForm.deleteItemAriaLabel', {
              defaultMessage: 'Delete item',
            })}
            size="s"
            iconType="cross"
            onClick={() => deleteHandler(item.aggName)}
            data-test-subj="transformAggregationEntryDeleteButton"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isSubAggSupported && (
        <>
          <EuiSpacer size="m" />
          {isPivotAggsConfigWithUiSupport(item) && item.subAggs && (
            <AggListForm
              aggOptions={aggOptions}
              onChange={sugAggUpdateHandler}
              deleteHandler={() => {}}
              list={item.subAggs}
              options={options}
            />
          )}
          <DropDown
            changeHandler={sugAggAddHandler}
            options={aggOptions}
            placeholder={i18n.translate(
              'xpack.transform.stepDefineForm.subAggregationsPlaceholder',
              {
                defaultMessage: 'Add a sub-aggregation ...',
              }
            )}
            testSubj="transformSubAggregationSelection"
          />
        </>
      )}
    </>
  );
};
