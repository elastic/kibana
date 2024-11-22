/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { SideHeader } from '../components/side_header';
import { FinalSideHelpInfo } from './final_side_help_info';
import * as i18n from './translations';
import { FieldFinalReadOnly } from '../final_readonly/field_final_readonly';
import { FieldFinalEdit } from '../final_edit/field_final_edit';
import { FinalSideMode } from './constants';
import type { UpgradeableDiffableFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { FinalSideContextProvider, useFinalSideContext } from './final_side_context';

interface FieldFinalSideProps {
  fieldName: UpgradeableDiffableFields;
}

export function FieldFinalSide({ fieldName }: FieldFinalSideProps): JSX.Element {
  return (
    <>
      <SideHeader>
        <EuiTitle size="xxs">
          <h3>
            {i18n.FINAL_UPDATE}
            <FinalSideHelpInfo />
          </h3>
        </EuiTitle>
      </SideHeader>
      <FinalSideContextProvider fieldName={fieldName}>
        <FieldFinalSideContent />
      </FinalSideContextProvider>
    </>
  );
}

function FieldFinalSideContent(): JSX.Element {
  const { mode } = useFinalSideContext();

  switch (mode) {
    case FinalSideMode.READONLY:
      return <FieldFinalReadOnly />;
    case FinalSideMode.EDIT:
      return <FieldFinalEdit />;
    default:
      return assertUnreachable(mode);
  }
}
