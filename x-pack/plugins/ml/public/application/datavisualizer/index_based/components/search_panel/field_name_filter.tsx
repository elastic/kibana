/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FC, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Option, MultiselectPicker } from '../../../../components/multi_select_picker';
import type { OverallStats } from '../../../../../../common/types/datavisualizer';

interface Props {
  overallStats: OverallStats;
  setVisibleFieldNames(q: any): void;
  visibleFieldNames: string[];
}

export const DataVisualizerFieldNamesFilter: FC<Props> = ({
  overallStats,
  setVisibleFieldNames,
  visibleFieldNames,
}) => {
  const [items, setItems] = useState<Option[]>([]);

  useEffect(() => {
    const options: Option[] = [];
    if (overallStats) {
      Object.keys(overallStats).forEach((key) => {
        const fieldsGroup = overallStats[key as keyof OverallStats];
        if (Array.isArray(fieldsGroup) && fieldsGroup.length > 0) {
          fieldsGroup.forEach((field) => {
            if (field.existsInDocs === true && field.fieldName !== undefined) {
              options.push({ value: field.fieldName });
            }
          });
        }
      });
    }
    setItems(options);
  }, [overallStats]);
  const fieldNameTitle = useMemo(
    () =>
      i18n.translate('ml.dataVisualizer.indexBased.fieldNameSelect', {
        defaultMessage: 'Field name',
      }),
    []
  );

  return (
    <MultiselectPicker
      title={fieldNameTitle}
      options={items}
      onChange={setVisibleFieldNames}
      checkedOptions={visibleFieldNames}
    />
  );
};
