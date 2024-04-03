/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';

export const ManagedPipelineCallout = () => (
  <EuiCallOut
    color="danger"
    iconType="warning"
    data-test-subj="managedPipelineCallout"
    title={
      <FormattedMessage
        id="xpack.ingestPipelines.edit.managedCalloutTitle"
        defaultMessage="Editing a managed pipeline can break Kibana."
      />
    }
  >
    <FormattedMessage
      id="xpack.ingestPipelines.edit.managedCalloutDescription"
      defaultMessage="Managed pipelines are critical for internal operations."
    />
  </EuiCallOut>
);

export const DeprecatedPipelineCallout = () => (
  <EuiCallOut
    color="warning"
    iconType="warning"
    data-test-subj="deprecatedPipelineCallout"
    title={
      <FormattedMessage
        id="xpack.ingestPipelines.edit.deprecatedCalloutTitle"
        defaultMessage="This pipeline is deprecated"
      />
    }
  >
    <FormattedMessage
      id="xpack.ingestPipelines.edit.deprecatedCalloutDescription"
      defaultMessage="This pipeline is no longer supported and might be removed in a future release. Instead, use one of the other pipelines available or create a new one."
    />
  </EuiCallOut>
);
