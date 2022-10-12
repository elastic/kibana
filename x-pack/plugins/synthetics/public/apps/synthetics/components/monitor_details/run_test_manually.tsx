/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export const RunTestManually = () => {
  return (
    <EuiButton fill={true} iconType="beaker" isDisabled={true}>
      {RUN_TEST_LABEL}
    </EuiButton>
  );
};

const RUN_TEST_LABEL = i18n.translate('xpack.synthetics.monitorSummary.runTestManually', {
  defaultMessage: 'Run test manually',
});
