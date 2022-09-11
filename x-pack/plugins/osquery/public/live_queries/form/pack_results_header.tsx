/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactElement } from 'react';
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';
import { OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { useGetUserCasesPermissions } from '../../cases/use_get_cases_permissions';

interface PackResultsHeadersProps {
  actionId?: string;
  addToCase?: ({ isIcon }: { isIcon: boolean }) => ReactElement;
  queryIds: Array<{ value: string; field: string }>;
}

const StyledResultsHeading = styled(EuiFlexItem)`
  padding-right: 20px;
  border-right: 2px solid #d3dae6;
`;

const StyledIconsList = styled(EuiFlexItem)`
  align-content: center;
  justify-content: center;
  padding-left: 10px;
`;

// const IconComponent = () => (
//   <EuiButtonIcon iconType={'casesApp'} color="text" size="xs" iconSize="l" />
// );

export const PackResultsHeader = ({ actionId, addToCase }: PackResultsHeadersProps) => {
  const { cases } = useKibana().services;
  const casePermissions = useGetUserCasesPermissions();
  const CasesContext = cases.ui.getCasesContext();
  const casesOwner = useMemo(() => [SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER], []);

  return (
    <>
      <CasesContext owner={casesOwner} permissions={casePermissions}>
        <EuiFlexGroup direction="row" gutterSize="m">
          <StyledResultsHeading grow={false}>
            <EuiText>
              <h2>
                <FormattedMessage
                  id="xpack.osquery.liveQueryActionResults.results"
                  defaultMessage="Results"
                />
              </h2>
            </EuiText>
          </StyledResultsHeading>
          <StyledIconsList grow={false}>
            <span>{actionId && addToCase && addToCase({ isIcon: true })}</span>
          </StyledIconsList>
        </EuiFlexGroup>
        <EuiSpacer size={'l'} />
      </CasesContext>
    </>
  );
};
