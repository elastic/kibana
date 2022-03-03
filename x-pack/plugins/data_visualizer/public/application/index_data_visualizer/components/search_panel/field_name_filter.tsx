/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { Option, MultiSelectPicker } from '../../../common/components/multi_select_picker';
import { OverallStats } from '../../types/overall_stats';

interface Props {
  overallStats: OverallStats;
  setVisibleFieldNames(q: string[]): void;
  visibleFieldNames: string[];
  showEmptyFields: boolean;
}

export const DataVisualizerFieldNamesFilter: FC<Props> = ({
  overallStats,
  setVisibleFieldNames,
  visibleFieldNames,
  showEmptyFields,
}) => {
  const items: Option[] = useMemo(() => {
    const options: Option[] = [];
    if (overallStats) {
      Object.keys(overallStats).forEach((key) => {
        const fieldsGroup = overallStats[key as keyof OverallStats];
        if (Array.isArray(fieldsGroup) && fieldsGroup.length > 0) {
          fieldsGroup.forEach((field) => {
            if (
              (field.existsInDocs === true || showEmptyFields === true) &&
              field.fieldName !== undefined
            ) {
              options.push({ value: field.fieldName });
            } else {
              options.push({ value: field.fieldName, disabled: true });
            }
          });
        }
      });
    }
    return options;
  }, [overallStats, showEmptyFields]);

  const fieldNameTitle = useMemo(
    () =>
      i18n.translate('xpack.dataVisualizer.index.fieldNameSelect', {
        defaultMessage: 'Field name',
      }),
    []
  );

  return (
    <MultiSelectPicker
      title={fieldNameTitle}
      options={items}
      onChange={setVisibleFieldNames}
      checkedOptions={visibleFieldNames}
      dataTestSubj={'dataVisualizerFieldNameSelect'}
    />
  );
};
