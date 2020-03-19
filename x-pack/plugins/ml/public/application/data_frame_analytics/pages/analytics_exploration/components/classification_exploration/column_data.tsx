/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ConfusionMatrix } from '../../../../common/analytics';

interface ColumnData {
  actual_class: string;
  actual_class_doc_count: number;
  predicted_class?: string;
  count?: number;
  error_count?: number;
}

export const ACTUAL_CLASS_ID = 'actual_class';

export function getColumnData(confusionMatrixData: ConfusionMatrix[]) {
  const colData: Partial<ColumnData[]> = [];
  const columns: Array<{ id: string; display?: any }> = [
    {
      id: ACTUAL_CLASS_ID,
      display: <span />,
    },
  ];

  confusionMatrixData.forEach(classData => {
    const col: any = {
      actual_class: classData.actual_class,
      actual_class_doc_count: classData.actual_class_doc_count,
    };
    const predictedClasses = classData.predicted_classes || [];

    columns.push({ id: classData.actual_class });

    for (let i = 0; i < predictedClasses.length; i++) {
      const predictedClass = predictedClasses[i].predicted_class;
      const predictedClassCount = predictedClasses[i].count;
      col[predictedClass] = predictedClassCount;
    }

    colData.push(col);
  });

  return { columns, columnData: colData };
}
