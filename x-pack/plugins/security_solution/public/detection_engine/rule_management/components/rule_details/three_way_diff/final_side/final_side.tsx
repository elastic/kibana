/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';
import type { DiffableRule } from '../../../../../../../common/api/detection_engine';
import { FieldReadOnly } from '../final_readonly/field_readonly';
import { SideHeader } from '../components/side_header';
import { FinalSideHelpInfo } from './final_side_help_info';
import * as i18n from './translations';

interface FinalSideProps {
  fieldName: string;
  finalDiffableRule: DiffableRule;
}

export function FinalSide({ fieldName, finalDiffableRule }: FinalSideProps): JSX.Element {
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
      <FieldReadOnly fieldName={fieldName} finalDiffableRule={finalDiffableRule} />
    </>
  );
}
