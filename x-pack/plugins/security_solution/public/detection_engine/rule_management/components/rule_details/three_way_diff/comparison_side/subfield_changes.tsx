/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SubfieldChange } from './types';
import { Subfield } from './subfield';
import type { DiffableAllFields } from '../../../../../../../common/api/detection_engine';

interface SubfieldChangesProps {
  fieldName: keyof DiffableAllFields;
  subfieldChanges: SubfieldChange[];
}

export function SubfieldChanges({ fieldName, subfieldChanges }: SubfieldChangesProps) {
  return (
    <>
      {subfieldChanges.map((change, index) => {
        const shouldShowSeparator = index !== subfieldChanges.length - 1;

        return (
          <Subfield
            key={change.subfieldName}
            fieldName={fieldName}
            subfieldName={change.subfieldName}
            oldSubfieldValue={change.oldSubfieldValue}
            newSubfieldValue={change.newSubfieldValue}
            shouldShowSeparator={shouldShowSeparator}
          />
        );
      })}
    </>
  );
}
