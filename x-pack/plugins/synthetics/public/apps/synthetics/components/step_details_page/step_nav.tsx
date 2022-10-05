/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { StepPageNavigation } from './step_page_nav';
import { useStepDetailPage } from './hooks/use_step_detail_page';

export const StepDetailPageRightSideItem = () => {
  const [dateFormat] = useUiSetting$<string>('dateFormat');

  const { journey, handleNextRunHref, handlePreviousRunHref } = useStepDetailPage();

  if (!journey) return null;

  return (
    <StepPageNavigation
      dateFormat={dateFormat}
      handleNextRunHref={handleNextRunHref}
      handlePreviousRunHref={handlePreviousRunHref}
      nextCheckGroup={journey.details?.next?.checkGroup}
      previousCheckGroup={journey.details?.previous?.checkGroup}
      checkTimestamp={journey.details?.timestamp}
    />
  );
};
