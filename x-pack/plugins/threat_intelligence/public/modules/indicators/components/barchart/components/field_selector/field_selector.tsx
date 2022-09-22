/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiSelect, EuiSelectOption } from '@elastic/eui';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { SELECT } from './translations';
import { SecuritySolutionDataViewBase } from '../../../../../../types';
import { RawIndicatorFieldId } from '../../../../types/indicator';

export const DROPDOWN_TEST_ID = 'tiIndicatorFieldSelectorDropdown';

export interface IndicatorFieldSelectorProps {
  indexPattern: SecuritySolutionDataViewBase;
  valueChange: (value: string) => void;
  defaultStackByValue?: RawIndicatorFieldId;
}

const DEFAULT_STACK_BY_VALUE = RawIndicatorFieldId.Feed;

export const IndicatorFieldSelector = memo<IndicatorFieldSelectorProps>(
  ({ indexPattern, valueChange, defaultStackByValue = DEFAULT_STACK_BY_VALUE }) => {
    const [selectedField, setSelectedField] = useState<string>(defaultStackByValue);

    const fields: EuiSelectOption[] = useMemo(
      () =>
        indexPattern
          ? indexPattern.fields.map((f: DataViewField) => ({
              text: f.name,
              value: f.name,
            }))
          : [],
      [indexPattern]
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
        prepend={SELECT}
        value={selectedField}
      />
    );
  }
);
