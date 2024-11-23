/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import { FieldFinalReadOnly } from '../../final_readonly';
import { FieldFinalEdit } from '../../final_edit';
import { FieldFinalSideMode } from '../field_final_side_mode';
import { assertUnreachable } from '../../../../../../../../common/utility_types';
import { useFieldFinalSideContext } from '../context/field_final_side_context';
import * as i18n from './translations';

export function FieldFinalSideContent(): JSX.Element {
  const {
    state: { mode },
    actions: { setEditMode, setReadOnlyMode },
  } = useFieldFinalSideContext();

  switch (mode) {
    case FieldFinalSideMode.Readonly:
      return (
        <>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiButtonEmpty iconType="pencil" onClick={setEditMode}>
              {i18n.EDIT}
            </EuiButtonEmpty>
          </EuiFlexGroup>
          <FieldFinalReadOnly />
        </>
      );
    case FieldFinalSideMode.Edit:
      return (
        <>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiButtonEmpty iconType="pencil" onClick={setReadOnlyMode}>
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexGroup>
          <FieldFinalEdit />
        </>
      );
    default:
      return assertUnreachable(mode);
  }
}
