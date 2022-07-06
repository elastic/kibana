/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { HeaderPage } from '../header_page';
import * as i18n from './translations';
import { ErrorMessage } from '../use_push_to_service/callout/types';
import { NavButtons } from './nav_buttons';
import { useCasesContext } from '../cases_context/use_cases_context';

interface OwnProps {
  actionsErrors: ErrorMessage[];
}

type Props = OwnProps;

export const CasesTableHeader: FunctionComponent<Props> = ({ actionsErrors }) => {
  const { permissions } = useCasesContext();

  return (
    <HeaderPage title={i18n.PAGE_TITLE} border data-test-subj="cases-all-title">
      <EuiFlexGroup
        alignItems="center"
        gutterSize="m"
        wrap={true}
        data-test-subj="all-cases-header"
      >
        {permissions.all ? (
          <EuiFlexItem>
            <NavButtons actionsErrors={actionsErrors} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </HeaderPage>
  );
};
CasesTableHeader.displayName = 'CasesTableHeader';
