/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash/fp';
import React, { useMemo } from 'react';
import { QueryClientProvider, QueryClient } from 'react-query';

import { useAlertsHosts } from './use_alerts_hosts';

// @ts-expect-error update types
const CasesIntegrationComponent = (props) => {
  console.error('rpops', props);

  const alertsData = useMemo(() => {
    const alertIndices: string[] = [];
    const alertIds: string[] = [];

    // @ts-expect-error update types
    props.caseData.comments.forEach((comment) => {
      if (comment.type === 'generated_alert') {
        alertIndices.push(...comment.index);
        alertIds.push(...comment.alertId);
      }
    });

    return {
      alertIndices: uniq(alertIndices),
      alertIds: uniq(alertIds),
    };
  }, [props.caseData.comments]);

  // @ts-expect-error update types
  const { data } = useAlertsHosts(alertsData);

  console.error('alertsData', alertsData);

  console.error('data', data);

  return <>{'dupa'}</>;
};

export const CasesIntegration = React.memo(CasesIntegrationComponent);

const queryClient = new QueryClient();

// @ts-expect-error update types
const CasesIntegrationWrapperComponent = (props) => {
  return (
    <QueryClientProvider client={queryClient}>
      <CasesIntegration {...props} />
    </QueryClientProvider>
  );
};

const CasesIntegrationWrapper = React.memo(CasesIntegrationWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { CasesIntegrationWrapper as default };
