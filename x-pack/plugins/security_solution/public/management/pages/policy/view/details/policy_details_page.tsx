/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { PolicyDetailsForm } from './components/policy_details_form';
import { useWithEndpointPolicy } from '../../../../hooks/policy/use_with_endpoint_policy';
import { AdministrationListPage } from '../../../../components/administration_list_page';

export const PolicyDetailsPage = memo(() => {
  const { policyId } = useParams<{ policyId: string }>();
  const { data } = useWithEndpointPolicy(policyId);

  const pageTitle = useMemo(() => {
    if (data) {
      return data.item.name;
    }

    return <EuiSkeletonText lines={1} />;
  }, [data]);

  return (
    <AdministrationListPage
      data-test-subj="policyDetailsPage"
      title={pageTitle}
      // subtitle={policyDescription}
      // headerBackComponent={backToEndpointList}
      // actions={policyApiError ? undefined : headerRightContent}
      restrictWidth={true}
      hasBottomBorder={false}
    >
      <EuiSpacer size="xl" />

      {!data && <EuiSkeletonText lines={5} />}

      {data && <PolicyDetailsForm policyDetails={data.item} />}
    </AdministrationListPage>
  );
});
PolicyDetailsPage.displayName = 'PolicyDetailsPage';
