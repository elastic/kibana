/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NightshiftIcon } from './nightshift_icon';

export function NightshiftApp() {
  return (
    <EuiEmptyPrompt
      data-test-subj="nightshiftEmptyState"
      icon={<NightshiftIcon size="xxl" />}
      title={
        <h2>
          {i18n.translate('xpack.nightshift.emptyState.title', {
            defaultMessage: 'Nightshift',
          })}
        </h2>
      }
      body={
        <EuiText color="subdued" size="s">
          <p>
            {i18n.translate('xpack.nightshift.emptyState.comingSoon', {
              defaultMessage: 'Coming soon',
            })}
          </p>
        </EuiText>
      }
    />
  );
}
