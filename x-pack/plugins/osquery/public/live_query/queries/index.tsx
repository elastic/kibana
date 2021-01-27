/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';

import { useRouterNavigate } from '../../common/lib/kibana';
import { ActionsTable } from '../../actions/actions_table';

const QueriesPageComponent = () => {
  const newQueryLinkProps = useRouterNavigate('/live_query/queries/new');

  console.error('newQueryLinkProps', newQueryLinkProps);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle>
            <h1>{'Queries'}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill {...newQueryLinkProps}>
            {'New query'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <ActionsTable />
    </>
  );
};

export const QueriesPage = React.memo(QueriesPageComponent);
