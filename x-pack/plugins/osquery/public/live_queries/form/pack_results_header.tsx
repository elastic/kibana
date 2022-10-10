/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactElement } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';

interface PackResultsHeadersProps {
  actionId?: string;
  addToCase?: ({
    isIcon,
    iconProps,
  }: {
    isIcon: boolean;
    iconProps: Record<string, string>;
  }) => ReactElement;
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

export const PackResultsHeader = ({ actionId, addToCase }: PackResultsHeadersProps) => (
  <>
    <EuiSpacer size={'l'} />
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
        <span>
          {actionId &&
            addToCase &&
            addToCase({
              isIcon: true,
              iconProps: {
                color: 'text',
                size: 'xs',
                iconSize: 'l',
              },
            })}
        </span>
      </StyledIconsList>
    </EuiFlexGroup>
    <EuiSpacer size={'l'} />
  </>
);
