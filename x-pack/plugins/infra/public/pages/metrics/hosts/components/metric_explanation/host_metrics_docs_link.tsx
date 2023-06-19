/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { HOST_METRICS_DOC_HREF } from '../../constants';

export const HostMetricsDocsLink = () => {
  return (
    <>
      <EuiLink
        data-test-subj="hostsViewDocumentationLink"
        href={HOST_METRICS_DOC_HREF}
        target="_blank"
      >
        <FormattedMessage
          id="xpack.infra.hostsViewPage.tooltip.whatAreTheseMetricsLink"
          defaultMessage="What are these metrics?"
        />
      </EuiLink>
    </>
  );
};
