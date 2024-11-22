/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import { useFinalSideContext } from '../field_final_side';
import * as i18n from '../translations';
import { FieldReadOnly } from './field_readonly';

export function FieldFinalReadOnly(): JSX.Element {
  const { setEditMode, fieldName } = useFinalSideContext();

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiButtonEmpty iconType="pencil" onClick={setEditMode}>
          {i18n.EDIT_BUTTON_LABEL}
        </EuiButtonEmpty>
      </EuiFlexGroup>
      <FieldReadOnly fieldName={fieldName} />
    </>
  );
}
