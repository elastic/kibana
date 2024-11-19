/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiTitle, EuiLink } from '@elastic/eui';
import { useEnablement } from '../../../../hooks/use_enablement';
import * as labels from './labels';

export const EnablementEmptyState = () => {
  const { isEnabled, loading } = useEnablement();

  return !isEnabled && !loading ? (
    <EuiEmptyPrompt
      title={<h2>{labels.SYNTHETICS_APP_ENABLEMENT_TITLE}</h2>}
      body={
        <>
          <p>{labels.MONITOR_MANAGEMENT_DISABLED_MESSAGE}</p>
          <p>{labels.MONITOR_MANAGEMENT_CONTACT_ADMINISTRATOR}</p>
        </>
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <h3>{labels.LEARN_MORE_LABEL}</h3>
          </EuiTitle>
          <EuiLink
            data-test-subj="syntheticsEnablementEmptyStateLink"
            href="https://www.elastic.co/guide/en/observability/current/synthetics-get-started-ui.html#uptime-set-up-prereq"
            target="_blank"
          >
            {labels.DOCS_LABEL}
          </EuiLink>
        </>
      }
    />
  ) : null;
};
