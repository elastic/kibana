/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const availableControlsPanels = {
  HOST_OS_NAME: 'host.os.name',
  CLOUD_PROVIDER: 'cloud.provider',
  SERVICE_NAME: 'service.name',
};

export const helpMessages = {
  [availableControlsPanels.SERVICE_NAME]: (
    <FormattedMessage
      id="xpack.infra.hostsViewPage.table.tooltip.documentationLabel"
      defaultMessage="Use this to see the hosts your {APMDocs} services are running on"
      values={{
        APMDocs: (
          <EuiLink
            data-test-subj="hostsViewTooltipDocumentationLink"
            href="https://ela.st/docs-infra-apm"
            target="_blank"
          >
            <FormattedMessage
              id="xpack.infra.hostsViewPage.table.tooltip.documentationLink"
              defaultMessage="APM-instrumented"
            />
          </EuiLink>
        ),
      }}
    />
  ),
};
