/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SetupInstructionsLink } from '../../shared/links/setup_instructions_link';

export function EmptyPrompt() {
  return (
    <EuiEmptyPrompt
      iconType="eyeClosed"
      iconColor="subdued"
      title={
        <h2>
          {i18n.translate('xpack.apm.serviceMap.noServicesPromptTitle', {
            defaultMessage: 'No services available',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.apm.serviceMap.noServicesPromptDescription', {
            defaultMessage:
              'We can’t find any services to map within the currently selected time range and environment. Please try another range or check the environment selected. If you don’t have any services, please use our setup instructions to get started.',
          })}
        </p>
      }
      actions={<SetupInstructionsLink buttonFill={true} />}
    />
  );
}
