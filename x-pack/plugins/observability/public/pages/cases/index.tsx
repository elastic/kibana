/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageHeader,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { RouteParams } from '../../routes';

interface CasesProps {
  routeParams: RouteParams<'/cases'>;
}

export function CasesPage(props: CasesProps) {
  return (
    <EuiPage>
      <EuiPageHeader
        pageTitle={
          <>
            {i18n.translate('xpack.observability.casesTitle', { defaultMessage: 'Cases' })}{' '}
            <ExperimentalBadge />
          </>
        }
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiCallOut title="Coming soon" color="danger" iconType="alert">
              <p>This is the future home of cases.</p>
            </EuiCallOut>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiBasicTable columns={[]} items={[]} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageHeader>
    </EuiPage>
  );
}
