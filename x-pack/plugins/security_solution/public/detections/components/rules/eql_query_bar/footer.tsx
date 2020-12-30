/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';

import * as i18n from './translations';
import { ErrorsPopover } from './errors_popover';
import { EqlOverviewLink } from './eql_overview_link';

export interface Props {
  errors: string[];
  isLoading?: boolean;
}

const Container = styled(EuiPanel)`
  border-radius: 0;
  background: ${({ theme }) => theme.eui.euiPageBackgroundColor};
  padding: ${({ theme }) => theme.eui.euiSizeXS} ${({ theme }) => theme.eui.euiSizeS};
`;

const FlexGroup = styled(EuiFlexGroup)`
  min-height: ${({ theme }) => theme.eui.euiSizeXL};
`;

const Spinner = styled(EuiLoadingSpinner)`
  margin: 0 ${({ theme }) => theme.eui.euiSizeS};
`;

export const EqlQueryBarFooter: FC<Props> = ({ errors, isLoading }) => (
  <Container>
    <FlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
      <EuiFlexItem>
        {errors.length > 0 && (
          <ErrorsPopover ariaLabel={i18n.EQL_VALIDATION_ERROR_POPOVER_LABEL} errors={errors} />
        )}
        {isLoading && <Spinner data-test-subj="eql-validation-loading" size="m" />}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EqlOverviewLink />
      </EuiFlexItem>
    </FlexGroup>
  </Container>
);
