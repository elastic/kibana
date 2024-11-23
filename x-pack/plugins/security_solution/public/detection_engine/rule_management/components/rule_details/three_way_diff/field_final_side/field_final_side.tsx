/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { Subject } from 'rxjs';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { SideHeader } from '../components/side_header';
import { FieldFinalSideHelpInfo } from './field_final_side_help_info';
import { FieldFinalReadOnly } from '../final_readonly/field_final_readonly';
import { FieldFinalEdit } from '../final_edit/field_final_edit';
import { FieldFinalSideMode } from './field_final_side_mode';
import type { UpgradeableDiffableFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import {
  FieldFinalSideContextProvider,
  useFieldFinalSideContext,
} from './field_final_side_context';
import * as i18n from './translations';

interface FieldFinalSideProps {
  fieldName: UpgradeableDiffableFields;
  initialMode: FieldFinalSideMode;
}

export function FieldFinalSide({ fieldName, initialMode }: FieldFinalSideProps): JSX.Element {
  const submitSubject = useMemo(() => new Subject<void>(), []);
  const handleSaveButtonClick = useCallback(() => submitSubject.next(), [submitSubject]);

  return (
    <>
      <SideHeader>
        <EuiFlexGroup alignItems="stretch" justifyContent="center">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center">
              <EuiTitle size="xxs">
                <h3>
                  {i18n.FINAL_UPDATE}
                  <FieldFinalSideHelpInfo />
                </h3>
              </EuiTitle>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton iconType="checkInCircleFilled" size="s" onClick={handleSaveButtonClick}>
              {i18n.SAVE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </SideHeader>
      <FieldFinalSideContextProvider
        fieldName={fieldName}
        initialMode={initialMode}
        submitSubject={submitSubject}
      >
        <FieldFinalSideContent />
      </FieldFinalSideContextProvider>
    </>
  );
}

function FieldFinalSideContent(): JSX.Element {
  const {
    state: { mode },
  } = useFieldFinalSideContext();

  switch (mode) {
    case FieldFinalSideMode.Readonly:
      return <FieldFinalReadOnly />;
    case FieldFinalSideMode.Edit:
      return <FieldFinalEdit />;
    default:
      return assertUnreachable(mode);
  }
}
