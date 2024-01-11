/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, type FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPopover, EuiTextColor } from '@elastic/eui';

import type { AggName } from '../../../../../../common/types/aggregations';

import { isPivotAggsWithExtendedForm } from '../../../../common/pivot_aggs';
import { isPivotAggsConfigWithUiBase, PivotAggsConfig } from '../../../../common';
import { useAppDependencies } from '../../../../app_dependencies';

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';

import { getAggConfigUtils } from '../step_define/common/agg_utils';
import { getPivotDropdownOptions } from '../step_define/common/get_pivot_dropdown_options';
import { useWizardContext } from '../wizard/wizard';

import { PopoverForm } from './popover_form';
import { SubAggsSection } from './sub_aggs_section';

interface Props {
  item: PivotAggsConfig;
  otherAggNames: AggName[];
  parentAggId?: string;
}

export const AggLabelForm: FC<Props> = ({ item, otherAggNames, parentAggId }) => {
  const {
    ml: { useFieldStatsTrigger },
  } = useAppDependencies();
  const { closeFlyout } = useFieldStatsTrigger();
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  const { pivotConfig: actions } = useWizardActions();
  const { deleteAggregation, deleteSubAggregation, updateAggregation, updateSubAggregation } =
    actions;

  const utils = isPivotAggsWithExtendedForm(item) ? getAggConfigUtils(item) : undefined;
  const [isPopoverVisible, setPopoverVisibility] = useState(
    isPivotAggsWithExtendedForm(item) && !utils?.isValid()
  );

  const runtimeMappings = useWizardSelector((s) => s.advancedRuntimeMappingsEditor.runtimeMappings);

  const { aggOptionsData: options } = useMemo(
    () => getPivotDropdownOptions(dataView, runtimeMappings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runtimeMappings]
  );

  function updateHandler(updateItem: PivotAggsConfig) {
    if (parentAggId) {
      updateSubAggregation(updateItem);
    } else {
      updateAggregation(updateItem);
    }
    setPopoverVisibility(false);
    closeFlyout();
  }

  function deleteHandler() {
    if (parentAggId) {
      deleteSubAggregation(item.aggId);
    } else {
      deleteAggregation(item.aggId);
    }
  }

  const helperText = isPivotAggsWithExtendedForm(item) && utils?.helperText && utils.helperText();

  const isSubAggSupported =
    isPivotAggsConfigWithUiBase(item) &&
    item.isSubAggsSupported &&
    (isPivotAggsWithExtendedForm(item) ? utils?.isValid() : true);

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
              style={{ lineHeight: '20px' }}
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
                data-test-subj={`transformAggregationEntryEditButton_${item.aggName}`}
              />
            }
            isOpen={isPopoverVisible}
            closePopover={() => setPopoverVisibility(false)}
          >
            <PopoverForm
              defaultData={item}
              onChange={updateHandler}
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
            onClick={deleteHandler}
            data-test-subj="transformAggregationEntryDeleteButton"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isSubAggSupported && <SubAggsSection item={item} />}
    </>
  );
};
