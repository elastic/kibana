/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableAllFields } from '../../../../../../../common/api/detection_engine';
import { DiffView } from '../../json_diff/diff_view';
import { SubfieldHeader } from './subfield_header';
import { FIELDS_WITH_SUBFIELDS } from './constants';

function shouldDisplaySubfieldLabelForField(fieldName: keyof DiffableAllFields): boolean {
  return FIELDS_WITH_SUBFIELDS.includes(fieldName);
}

interface SubfieldProps {
  fieldName: keyof DiffableAllFields;
  subfieldName: string;
  oldSubfieldValue: string;
  newSubfieldValue: string;
}

export const Subfield = ({
  fieldName,
  subfieldName,
  oldSubfieldValue,
  newSubfieldValue,
}: SubfieldProps) => (
  <>
    {shouldDisplaySubfieldLabelForField(fieldName) && (
      <SubfieldHeader subfieldName={subfieldName} />
    )}
    <DiffView oldSource={oldSubfieldValue} newSource={newSubfieldValue} viewType="unified" />
  </>
);
