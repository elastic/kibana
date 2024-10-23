/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import { FieldReadOnly } from './field_readonly';
import * as i18n from '../translations';
import { useFinalSideContext } from '../final_side/final_side_context';

export function FinalReadOnly() {
  const { setEditMode, fieldName } = useFinalSideContext();

  return (
    <>
      <EuiButtonEmpty iconType="pencil" onClick={setEditMode}>
        {i18n.EDIT_BUTTON_LABEL}
      </EuiButtonEmpty>
      <FieldReadOnly fieldName={fieldName} />
    </>
  );
}
