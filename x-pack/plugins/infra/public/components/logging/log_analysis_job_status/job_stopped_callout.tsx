/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const JobStoppedCallout: React.FC = () => (
  <EuiCallOut color="primary" title={jobStoppedTitle}>
    <FormattedMessage
      id="xpack.infra.logs.analysis.jobStoppedCalloutMessage"
      defaultMessage="The ML job has been stopped manually or due to a lack of resources. New log entries will not be processed until the job has been restarted."
      tagName="p"
    />
  </EuiCallOut>
);

const jobStoppedTitle = i18n.translate('xpack.infra.logs.analysis.jobStoppedCalloutTitle', {
  defaultMessage: 'ML job stopped',
});
