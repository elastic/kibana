/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiTitle } from '@elastic/eui';
import type { DiffableRule } from '../../../../../../../common/api/detection_engine';
import { SideHeader } from '../components/side_header';
import { FinalSideHelpInfo } from './final_side_help_info';
import * as i18n from './translations';
import { FinalReadOnly } from '../final_readonly/final_readonly';
import { FinalEdit } from '../final_edit/final_edit';
// import { FinalEdit } from '../final_edit/final_edit_2';
import type { SetFieldResolvedValueFn } from '../../../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_prebuilt_rules_upgrade_state';

interface FinalSideProps {
  fieldName: string;
  finalDiffableRule: DiffableRule;
  setFieldResolvedValue: SetFieldResolvedValueFn;
}

export function FinalSide({
  fieldName,
  finalDiffableRule,
  setFieldResolvedValue,
}: FinalSideProps): JSX.Element {
  const [mode, setMode] = React.useState<'readonly' | 'edit'>('readonly'); // This is temporary, will be replaced with state from the context
  const setReadOnlyMode = useCallback(() => setMode('readonly'), []);
  const setEditMode = useCallback(() => setMode('edit'), []);

  return (
    <>
      <SideHeader>
        <EuiTitle size="xs">
          <h3>
            {i18n.UPGRADED_VERSION}
            <FinalSideHelpInfo />
          </h3>
        </EuiTitle>
      </SideHeader>
      {mode === 'edit' ? (
        <FinalEdit
          fieldName={fieldName}
          finalDiffableRule={finalDiffableRule}
          setReadOnlyMode={setReadOnlyMode}
          setFieldResolvedValue={setFieldResolvedValue}
        />
      ) : (
        <FinalReadOnly
          fieldName={fieldName}
          finalDiffableRule={finalDiffableRule}
          setEditMode={setEditMode}
        />
      )}
    </>
  );
}
