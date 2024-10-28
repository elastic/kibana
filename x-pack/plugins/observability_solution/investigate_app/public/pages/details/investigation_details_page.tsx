/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { InvestigationNotFound } from '../../components/investigation_not_found/investigation_not_found';
import { useFetchInvestigation } from '../../hooks/use_fetch_investigation';
import { useKibana } from '../../hooks/use_kibana';
import { InvestigationDetails } from './components/investigation_details/investigation_details';
import { InvestigationProvider } from './contexts/investigation_context';
import { InvestigationDetailsPathParams } from './types';

export function InvestigationDetailsPage() {
  const {
    core: { security },
  } = useKibana();
  const { investigationId } = useParams<InvestigationDetailsPathParams>();

  const user = useAsync(() => {
    return security.authc.getCurrentUser();
  }, [security]);

  const {
    data: investigation,
    isLoading: isFetchInvestigationLoading,
    isError: isFetchInvestigationError,
  } = useFetchInvestigation({ id: investigationId });

  if (isFetchInvestigationLoading || user.loading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (isFetchInvestigationError || !investigation || !user.value) {
    return <InvestigationNotFound />;
  }

  return (
    <InvestigationProvider initialInvestigation={investigation}>
      <InvestigationDetails user={user.value} />
    </InvestigationProvider>
  );
}
