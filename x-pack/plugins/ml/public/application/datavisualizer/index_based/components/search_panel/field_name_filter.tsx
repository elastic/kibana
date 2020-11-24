/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FC, useEffect, useState } from 'react';
import { Option, MultiselectPicker } from '../../../../components/multi_select_picker';

interface OveralStats {
  [key: string]: any[];
}
interface Props {
  overallStats: OveralStats;
}

export const DatavisualizerFieldNameFilter: FC<Props> = ({ overallStats }) => {
  const [items, setItems] = useState<Option[]>([]);

  useEffect(() => {
    const options: Option[] = [];
    if (overallStats) {
      Object.keys(overallStats).forEach((key) => {
        const fieldsGroup = overallStats[key];
        if (Array.isArray(fieldsGroup) && fieldsGroup.length > 0) {
          fieldsGroup.forEach((field) => {
            if (field.existsInDocs === true && field.fieldName !== undefined) {
              options.push({ name: field.fieldName });
            }
          });
        }
      });
    }
    setItems(options);
  }, [overallStats]);

  return <MultiselectPicker title="Field name" options={items} onChange={() => {}} />;
};
