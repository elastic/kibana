/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useCallback, useContext } from 'react';
import {
  EuiButtonIcon,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { EVENT_RATE_FIELD_ID, Field } from '../../../../../common/types/fields';
import { MLJobWizardFieldStatsFlyoutContext } from '../pages/components/pick_fields_step/components/field_stats_flyout/field_stats_flyout';
import { getKbnFieldIconType } from '../../../../../common/util/get_field_icon_types';

interface Option extends EuiComboBoxOptionOption<string> {
  field: Field;
}
export const useFieldStatsTrigger = () => {
  const { setIsFlyoutVisible, setFieldName } = useContext(MLJobWizardFieldStatsFlyoutContext);
  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption, searchValue: string): ReactNode => {
      const field = (option as Option).field;
      return option.isGroupLabelOption || !field ? (
        option.label
      ) : (
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              disabled={field.id === EVENT_RATE_FIELD_ID}
              size="xs"
              iconType="inspect"
              onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
                if (ev.type === 'click') {
                  ev.currentTarget.focus();
                }
                ev.preventDefault();
                ev.stopPropagation();

                if (typeof field.id === 'string') {
                  setFieldName(field.id);
                  setIsFlyoutVisible(true);
                }
              }}
              aria-label={i18n.translate('xpack.ml.fieldContextPopover.topFieldValuesAriaLabel', {
                defaultMessage: 'Show top 10 field values',
              })}
              data-test-subj={'mlAggSelectFieldStatsPopoverButton'}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FieldIcon type={getKbnFieldIconType(field.type)} fill="none" />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    []
  );
  return { renderOption, setIsFlyoutVisible, setFieldName };
};
