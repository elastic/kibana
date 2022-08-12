/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiSelect, EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { RawIndicatorFieldId } from '../../../../../common/types/indicator';

export const DROPDOWN_TEST_ID = 'tiIndicatorFieldSelectorDropdown';

export interface IndicatorsFieldSelectorProps {
  indexPatterns: DataView[];
  valueChange: (value: string) => void;
  defaultStackByValue?: RawIndicatorFieldId;
}

const DEFAULT_STACK_BY_VALUE = RawIndicatorFieldId.Feed;

export const IndicatorsFieldSelector = memo<IndicatorsFieldSelectorProps>(
  ({ indexPatterns, valueChange, defaultStackByValue = DEFAULT_STACK_BY_VALUE }) => {
    const [selectedField, setSelectedField] = useState<string>(defaultStackByValue);

    const fields: EuiSelectOption[] = useMemo(
      () =>
        indexPatterns && indexPatterns.length > 0
          ? indexPatterns[0].fields.map((f: DataViewField) => ({
              text: f.name,
              value: f.name,
            }))
          : [],
      [indexPatterns]
    );

    const selectedFieldChange = useCallback(
      (fieldName: string) => {
        valueChange(fieldName);
        setSelectedField(fieldName);
      },
      [valueChange]
    );

    return (
      <EuiSelect
        data-test-subj={DROPDOWN_TEST_ID}
        onChange={(event) => selectedFieldChange(event.target.value)}
        options={fields}
        prepend={i18n.translate('xpack.threatIntelligence.indicator.fieldSelector.label', {
          defaultMessage: 'Stack by',
        })}
        value={selectedField}
      />
    );
  }
);
