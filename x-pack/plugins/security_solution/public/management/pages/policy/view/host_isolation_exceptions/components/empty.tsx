/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate, EuiProgress } from '@elastic/eui';
import React from 'react';
import {
  MANAGEMENT_DEFAULT_PAGE,
  MANAGEMENT_DEFAULT_PAGE_SIZE,
} from '../../../../../common/constants';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { useAppUrl } from '../../../../../../common/lib/kibana';
import { getHostIsolationExceptionsListPath } from '../../../../../common/routing';
import { useFetchHostIsolationExceptionsList } from '../../../../host_isolation_exceptions/view/hooks';
import { PolicyHostIsolationExceptionsEmptyUnexisting } from './empty_non_existent';
import { PolicyHostIsolationExceptionsEmptyUnassigned } from './empty_unassigned';

export const PolicyHostIsolationExceptionsEmpty = ({ policyName }: { policyName: string }) => {
  const { getAppUrl } = useAppUrl();
  const toHostIsolationList = getAppUrl({
    appId: APP_UI_ID,
    path: getHostIsolationExceptionsListPath(),
  });

  const allPolicyExceptionsListRequest = useFetchHostIsolationExceptionsList({
    page: MANAGEMENT_DEFAULT_PAGE,
    perPage: MANAGEMENT_DEFAULT_PAGE_SIZE,
  });

  const hasNoExistingExceptions = allPolicyExceptionsListRequest.data?.total === 0;

  return !allPolicyExceptionsListRequest.isLoading ? (
    <EuiPageTemplate
      template="centeredContent"
      data-test-subj={'policyHostIsolationExceptionsEmpty'}
    >
      {hasNoExistingExceptions ? (
        <PolicyHostIsolationExceptionsEmptyUnexisting toHostIsolationList={toHostIsolationList} />
      ) : (
        <PolicyHostIsolationExceptionsEmptyUnassigned
          policyName={policyName}
          toHostIsolationList={toHostIsolationList}
        />
      )}
    </EuiPageTemplate>
  ) : (
    <EuiProgress size="xs" color="primary" />
  );
};

PolicyHostIsolationExceptionsEmpty.displayName = 'PolicyHostIsolationExceptionsEmpty';
