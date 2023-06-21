/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StepPageNavigation } from '../../step_details_page/step_page_nav';

export const TestRunDate = () => {
  return (
    <EuiDescriptionList
      listItems={[
        { title: ERROR_DURATION, description: <StepPageNavigation testRunPage={true} /> },
      ]}
    />
  );
};

const ERROR_DURATION = i18n.translate('xpack.synthetics.testDetails.date', {
  defaultMessage: 'Date',
});
