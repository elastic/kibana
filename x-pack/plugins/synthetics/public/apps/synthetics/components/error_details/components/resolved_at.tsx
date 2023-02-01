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
import { useDateFormat } from '../../../../../hooks/use_date_format';

export const ResolvedAt: React.FC = () => {
  const { failedTests } = useErrorFailedTests();

  const state = failedTests?.[0]?.state;

  const formatter = useDateFormat();
  let endsAt: string | ReactElement = formatter(state?.ends ?? '');

  if (!endsAt) {
    endsAt = 'N/A';
  }

  return <EuiDescriptionList listItems={[{ title: ERROR_DURATION, description: endsAt }]} />;
};

const ERROR_DURATION = i18n.translate('xpack.synthetics.errorDetails.resolvedAt', {
  defaultMessage: 'Resolved at',
});
