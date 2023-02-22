/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactElement } from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useErrorFailedTests } from '../hooks/use_last_error_state';
import { useFormatTestRunAt } from '../../../utils/monitor_test_result/test_time_formats';

export const ResolvedAt: React.FC = () => {
  const { failedTests } = useErrorFailedTests();

  const state = failedTests?.[0]?.state;

  let endsAt: string | ReactElement = useFormatTestRunAt(state?.ends ?? '');

  if (!endsAt) {
    endsAt = 'N/A';
  }

  return <EuiDescriptionList listItems={[{ title: ERROR_DURATION, description: endsAt }]} />;
};

const ERROR_DURATION = i18n.translate('xpack.synthetics.errorDetails.resolvedAt', {
  defaultMessage: 'Resolved at',
});
