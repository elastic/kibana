/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import type { DiffableRule } from '../../../../../../../common/api/detection_engine';
import { FieldReadOnly } from './field_readonly';

interface FinalReadOnlyProps {
  fieldName: string;
  finalDiffableRule: DiffableRule;
  setEditMode: () => void;
}

export function FinalReadOnly({ fieldName, finalDiffableRule, setEditMode }: FinalReadOnlyProps) {
  return (
    <>
      <EuiButtonEmpty iconType="pencil" onClick={setEditMode}>
        {'Edit'}
      </EuiButtonEmpty>
      <FieldReadOnly fieldName={fieldName} finalDiffableRule={finalDiffableRule} />
    </>
  );
}
