/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

const SYNTHETICS_CALLOUT_LS_KEY = 'xpack.uptime.syntheticsCallout.display';
const shouldShowSyntheticsCallout = () => {
  let value = localStorage.getItem(SYNTHETICS_CALLOUT_LS_KEY);
  if (value === null) {
    localStorage.setItem(SYNTHETICS_CALLOUT_LS_KEY, 'true');
    value = 'true';
  }
  return value === 'true';
};
const hideSyntheticsCallout = () => localStorage.setItem(SYNTHETICS_CALLOUT_LS_KEY, 'false');

export const SyntheticsCallout = () => {
  const [shouldShow, setShouldShow] = useState<boolean>(shouldShowSyntheticsCallout());
  if (!shouldShow) {
    return null;
  }
  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.uptime.overview.pageHeader.syntheticsCallout.title', {
          defaultMessage: 'Elastic Synthetics',
        })}
        iconType="beaker"
      >
        <p>
          <FormattedMessage
            id="xpack.uptime.overview.pageHeader.syntheticsCallout.content"
            defaultMessage="Elastic Uptime now supports synthetic browser monitors! Learn how to use them {here}."
            values={{ here: <a href="https://elastic.co/synthetics">here</a> }}
          />
        </p>
        <EuiButton
          onClick={() => {
            if (shouldShow) {
              hideSyntheticsCallout();
              setShouldShow(false);
            }
          }}
        >
          <FormattedMessage
            id="xpack.uptime.overview.pageHeader.syntheticsCallout.dismissButtonText"
            defaultMessage="Dismiss"
          />
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
};
