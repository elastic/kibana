/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export function CorrelationsEmptyStatePrompt() {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiEmptyPrompt
        iconType="minusInCircle"
        title={
          <EuiText size="s">
            <h2>
              {i18n.translate('xpack.apm.correlations.noCorrelationsTitle', {
                defaultMessage: 'No significant correlations',
              })}
            </h2>
          </EuiText>
        }
        body={
          <>
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.apm.correlations.noCorrelationsTextLine1"
                  defaultMessage="Correlations will only be identified if they have significant impact."
                />
                <br />
                <FormattedMessage
                  id="xpack.apm.correlations.noCorrelationsTextLine2"
                  defaultMessage="Try selecting another time range or remove any added filter."
                />
              </p>
            </EuiText>
          </>
        }
      />
    </>
  );
}
