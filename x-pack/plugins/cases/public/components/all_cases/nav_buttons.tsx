/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import { ConfigureCaseButton } from '../configure_cases/button';
import * as i18n from './translations';
import { CasesNavigation, LinkButton } from '../links';
import { ErrorMessage } from '../callout/types';

interface OwnProps {
  actionsErrors: ErrorMessage[];
  configureCasesNavigation: CasesNavigation;
  createCaseNavigation: CasesNavigation;
  userCanCrud: boolean;
}

type Props = OwnProps;

export const NavButtons: FunctionComponent<Props> = ({
  actionsErrors,
  configureCasesNavigation,
  createCaseNavigation,
  userCanCrud,
}) => (
  <EuiFlexGroup>
    <EuiFlexItem grow={false}>
      <ConfigureCaseButton
        configureCasesNavigation={configureCasesNavigation}
        label={i18n.CONFIGURE_CASES_BUTTON}
        isDisabled={!isEmpty(actionsErrors) || !userCanCrud}
        showToolTip={!isEmpty(actionsErrors)}
        msgTooltip={!isEmpty(actionsErrors) ? actionsErrors[0].description : <></>}
        titleTooltip={!isEmpty(actionsErrors) ? actionsErrors[0].title : ''}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <LinkButton
        isDisabled={!userCanCrud}
        fill
        onClick={createCaseNavigation.onClick}
        href={createCaseNavigation.href}
        iconType="plusInCircle"
        data-test-subj="createNewCaseBtn"
      >
        {i18n.CREATE_TITLE}
      </LinkButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
