/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiHealth } from '@elastic/eui';

const statusToHealthMap = {
  stopped: (
    <EuiHealth color="subdued">
      <FormattedMessage id="xpack.rollupJobs.jobStatus.stoppedLabel" defaultMessage="Stopped" />
    </EuiHealth>
  ),
  stopping: (
    <EuiHealth color="warning">
      <FormattedMessage id="xpack.rollupJobs.jobStatus.stoppingLabel" defaultMessage="Stopping" />
    </EuiHealth>
  ),
  started: (
    <EuiHealth color="success">
      <FormattedMessage id="xpack.rollupJobs.jobStatus.startedLabel" defaultMessage="Started" />
    </EuiHealth>
  ),
  indexing: (
    <EuiHealth color="warning">
      <FormattedMessage id="xpack.rollupJobs.jobStatus.indexingLabel" defaultMessage="Indexing" />
    </EuiHealth>
  ),
  abort: (
    <EuiHealth color="danger">
      <FormattedMessage id="xpack.rollupJobs.jobStatus.abortingLabel" defaultMessage="Aborting" />
    </EuiHealth>
  ),
};

const statusUnknown = (
  <EuiHealth color="subdued">
    <FormattedMessage id="xpack.rollupJobs.jobStatus.unknownLabel" defaultMessage="Unknown" />
  </EuiHealth>
);

export const JobStatus = ({ status }) => statusToHealthMap[status] || statusUnknown;
