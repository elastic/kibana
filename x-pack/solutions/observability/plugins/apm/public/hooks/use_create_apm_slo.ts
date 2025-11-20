/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useState } from 'react';
import type { ComponentType } from 'react';
import type { CreateSLOInput } from '@kbn/slo-schema';
import type { RecursivePartial } from '@kbn/utility-types';
import { useMaybeApmParams, useAnyOfApmParams } from './use_apm_params';

interface ServicesWithSLO {
  slo?: {
    getCreateSLOFlyout: (options: {
      initialValues?: RecursivePartial<CreateSLOInput>;
      onClose: () => void;
    }) => ComponentType | null;
  };
}

export function useCreateApmSLO() {
  const { slo } = useKibana<ServicesWithSLO>().services;
  const [isSLOFlyoutOpen, setIsSLOFlyoutOpen] = useState(false);

  // Get serviceName from any route that has it
  const serviceParams = useAnyOfApmParams(
    '/services/{serviceName}/*',
    '/mobile-services/{serviceName}/*'
  );

  const serviceOverviewParams = useMaybeApmParams('/services/{serviceName}/overview');

  const transactionDetailsParams = useMaybeApmParams('/services/{serviceName}/transactions/view');
  const mobileTransactionDetailsParams = useMaybeApmParams(
    '/mobile-services/{serviceName}/transactions/view'
  );
  const activeTransactionParams = transactionDetailsParams || mobileTransactionDetailsParams;

  // Determine which route we're on and get the appropriate params
  const isServiceOverview = !!serviceOverviewParams;
  const isTransactionDetails = !!activeTransactionParams;

  const serviceName = serviceParams?.path.serviceName || '';
  const transactionType = activeTransactionParams?.query.transactionType || '';

  const initialValues: RecursivePartial<CreateSLOInput> = {
    indicator: {
      type: 'sli.apm.transactionDuration' as const,
      params: {
        service: serviceName,
        environment: isServiceOverview
          ? serviceOverviewParams?.query.environment || ''
          : isTransactionDetails
          ? activeTransactionParams?.query.environment || ''
          : '',
        transactionType: isTransactionDetails
          ? activeTransactionParams?.query.transactionType || transactionType || ''
          : '',
        transactionName: isTransactionDetails
          ? activeTransactionParams?.query.transactionName || ''
          : '',
        threshold: 250,
        filter: '',
        index: '',
      },
    },
  };

  const CreateSLOFlyout = slo?.getCreateSLOFlyout({
    initialValues,
    onClose: () => {
      setIsSLOFlyoutOpen(false);
    },
  });

  const handleViewSLO = undefined;

  return {
    CreateSLOFlyout: isSLOFlyoutOpen ? CreateSLOFlyout : null,
    setIsSLOFlyoutOpen,
    onViewSLO: undefined,
  };
}
