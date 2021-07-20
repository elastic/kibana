/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import styled, { css } from 'styled-components';
import { ConfigureCaseButton } from '../configure_cases/button';
import * as i18n from './translations';
import { CasesNavigation, LinkButton } from '../links';
import { ErrorMessage } from '../use_push_to_service/callout/types';

const ButtonFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    & {
      @media only screen and (max-width: ${theme.eui.euiBreakpoints.s}) {
        flex-direction: column;
      }
    }
  `}
`;

interface OwnProps {
  actionsErrors: ErrorMessage[];
  configureCasesNavigation: CasesNavigation;
  createCaseNavigation: CasesNavigation;
}

type Props = OwnProps;

export const NavButtons: FunctionComponent<Props> = ({
  actionsErrors,
  configureCasesNavigation,
  createCaseNavigation,
}) => (
  <ButtonFlexGroup responsive={false}>
    <EuiFlexItem grow={false}>
      <ConfigureCaseButton
        configureCasesNavigation={configureCasesNavigation}
        label={i18n.CONFIGURE_CASES_BUTTON}
        isDisabled={!isEmpty(actionsErrors)}
        showToolTip={!isEmpty(actionsErrors)}
        msgTooltip={!isEmpty(actionsErrors) ? <>{actionsErrors[0].description}</> : <></>}
        titleTooltip={!isEmpty(actionsErrors) ? actionsErrors[0].title : ''}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <LinkButton
        fill
        onClick={createCaseNavigation.onClick}
        href={createCaseNavigation.href}
        iconType="plusInCircle"
        data-test-subj="createNewCaseBtn"
      >
        {i18n.CREATE_TITLE}
      </LinkButton>
    </EuiFlexItem>
  </ButtonFlexGroup>
);
