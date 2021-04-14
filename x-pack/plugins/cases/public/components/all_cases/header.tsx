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
import { CaseHeaderPage } from '../case_header_page';
import * as i18n from './translations';
import { Count } from './count';
import { ConfigureCaseButton } from '../configure_cases/button';
import { CasesNavigation, LinkButton } from '../links';
import FlexItemDivider from './index';
import { ErrorMessage } from '../callout/types';

interface OwnProps {
  actionsErrors: ErrorMessage[];
  configureCasesNavigation: CasesNavigation;
  refresh: number;
  userCanCrud: boolean;
}

type Props = OwnProps;

const FlexItemDivider = styled(EuiFlexItem)`
  ${({ theme }) => css`
    .euiFlexGroup--gutterMedium > &.euiFlexItem {
      border-right: ${theme.eui.euiBorderThin};
      padding-right: ${theme.eui.euiSize};
      margin-right: ${theme.eui.euiSize};
    }
  `}
`;

export const AllCasesHeader: FunctionComponent<Props> = ({
  configureCasesNavigation,
  refresh,
  userCanCrud,
}) => {
  return (
    <CaseHeaderPage title={i18n.PAGE_TITLE}>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="m"
        responsive={false}
        wrap={true}
        data-test-subj="all-cases-header"
      >
        <FlexItemDivider grow={false}>
          <Count refresh={refresh} />
        </FlexItemDivider>
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
    </CaseHeaderPage>
  );
};
