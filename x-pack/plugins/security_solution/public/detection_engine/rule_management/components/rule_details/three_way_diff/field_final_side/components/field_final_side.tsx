/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FieldFinalSideMode } from '../field_final_side_mode';
import { FieldUpgradeState } from '../../../../../model/prebuilt_rule_upgrade';
import type { UpgradeableDiffableFields } from '../../../../../model/prebuilt_rule_upgrade/fields';
import { FieldFinalSideContextProvider } from '../context/field_final_side_context';
import { FieldEditFormContextProvider } from '../context/field_edit_form_context';
import { FieldFinalSideContent } from './field_final_side_content';
import { FieldFinalSideHeader } from './field_final_side_header';

interface FieldFinalSideProps {
  fieldName: UpgradeableDiffableFields;
  fieldUpgradeState: FieldUpgradeState;
}

export function FieldFinalSide({ fieldName, fieldUpgradeState }: FieldFinalSideProps): JSX.Element {
  const initialMode =
    fieldUpgradeState === FieldUpgradeState.NonSolvableConflict
      ? FieldFinalSideMode.Edit
      : FieldFinalSideMode.Readonly;

  return (
    <FieldEditFormContextProvider>
      <FieldFinalSideContextProvider fieldName={fieldName} initialMode={initialMode}>
        <FieldFinalSideHeader fieldUpgradeState={fieldUpgradeState} />
        <FieldFinalSideContent />
      </FieldFinalSideContextProvider>
    </FieldEditFormContextProvider>
  );
}
