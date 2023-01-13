/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { EuiDescriptionList, EuiLoadingContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useJourneySteps } from '../../monitor_details/hooks/use_journey_steps';
import { useFormatTestRunAt } from '../../../utils/monitor_test_result/test_time_formats';

export const TestRunDate: React.FC = () => {
  const { data } = useJourneySteps();

  let startedAt: string | ReactElement = useFormatTestRunAt(data?.details?.timestamp);

  if (!startedAt) {
    startedAt = <EuiLoadingContent lines={1} />;
  }

  return <EuiDescriptionList listItems={[{ title: ERROR_DURATION, description: startedAt }]} />;
};

const ERROR_DURATION = i18n.translate('xpack.synthetics.testDetails.date', {
  defaultMessage: 'Date',
});
