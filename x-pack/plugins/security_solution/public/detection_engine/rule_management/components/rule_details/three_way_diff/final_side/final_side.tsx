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
import { FinalReadOnly } from '../final_readonly/final_readonly';
import { FinalEdit } from '../final_edit/final_edit';
import { FinalSideMode } from './constants';
import type { UpgradeableDiffableFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { FinalSideContextProvider, useFinalSideContext } from './final_side_context';

interface FinalSideProps {
  fieldName: UpgradeableDiffableFields;
}

export function FinalSide({ fieldName }: FinalSideProps): JSX.Element {
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
        <FinalSideContent />
      </FinalSideContextProvider>
    </>
  );
}

function FinalSideContent(): JSX.Element {
  const { mode } = useFinalSideContext();

  switch (mode) {
    case FinalSideMode.READONLY:
      return <FinalReadOnly />;
    case FinalSideMode.EDIT:
      return <FinalEdit />;
    default:
      return assertUnreachable(mode);
  }
}
