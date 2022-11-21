/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';
import { fetchLastSuccessfulCheck } from '../../../../state';
import { JourneyStep } from '../../../../../../../common/runtime_types';
import { EmptyImage } from '../../../common/screenshot/empty_image';
import { JourneyStepScreenshotContainer } from '../../../common/screenshot/journey_step_screenshot_container';

export const LastSuccessfulScreenshot = ({ step }: { step: JourneyStep }) => {
  const { stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();

  const { data, loading } = useFetcher(() => {
    return fetchLastSuccessfulCheck({
      timestamp: step['@timestamp'],
      monitorId: step.monitor.id,
      stepIndex: Number(stepIndex),
      location: step.observer?.geo?.name,
    });
  }, [step._id, step['@timestamp']]);

  if (loading || !data) {
    return <EmptyImage isLoading={Boolean(loading)} />;
  }

  return (
    <>
      <JourneyStepScreenshotContainer
        checkGroup={data?.monitor.check_group}
        initialStepNo={data?.synthetics?.step?.index}
        stepStatus={data?.synthetics?.payload?.status}
        allStepsLoaded={true}
        stepLabels={[]}
        retryFetchOnRevisit={false}
        asThumbnail={false}
      />
      <EuiSpacer size="xs" />
    </>
  );
};
