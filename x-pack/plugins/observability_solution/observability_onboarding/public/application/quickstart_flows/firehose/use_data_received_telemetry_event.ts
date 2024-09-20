/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect, useState } from 'react';
import { difference } from 'lodash';
import { OBSERVABILITY_ONBOARDING_FIREHOSE_DATA_RECEIVED_TELEMETRY_EVENT } from '../../../../common/telemetry_events';
import { AWSIndexName } from '../../../../common/aws_firehose';
import { ObservabilityOnboardingAppServices } from '../../..';
import { CreateStackOption } from './types';

export function useDataReceivedTelemetryEvent({
  populatedAWSLogsIndexList,
  selectedCreateStackOption,
  onboardingId,
}: {
  populatedAWSLogsIndexList: AWSIndexName[];
  selectedCreateStackOption: CreateStackOption;
  onboardingId: string;
}) {
  const [reportedIndexList, setReportedIndexList] = useState<AWSIndexName[]>([]);
  const {
    services: {
      analytics,
      context: { cloudServiceProvider },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

  useEffect(() => {
    difference(populatedAWSLogsIndexList, reportedIndexList).forEach((indexName) => {
      analytics?.reportEvent(
        OBSERVABILITY_ONBOARDING_FIREHOSE_DATA_RECEIVED_TELEMETRY_EVENT.eventType,
        {
          indexName,
          selectedCreateStackOption,
          cloudServiceProvider,
          onboardingId,
        }
      );
    });
    setReportedIndexList(populatedAWSLogsIndexList);
  }, [
    analytics,
    cloudServiceProvider,
    onboardingId,
    populatedAWSLogsIndexList,
    reportedIndexList,
    selectedCreateStackOption,
  ]);
}
