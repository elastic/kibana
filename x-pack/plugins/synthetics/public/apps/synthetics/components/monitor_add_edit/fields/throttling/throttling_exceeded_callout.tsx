/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const ThrottlingExceededCallout = () => {
  return (
    <>
      <EuiSpacer />
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.synthetics.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.exceeded_throttling.title"
            defaultMessage="You've exceeded the Synthetics Node bandwidth limits"
          />
        }
        color="warning"
        iconType="warning"
      >
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.exceeded_throttling.message"
          defaultMessage="When using throttling values larger than a Synthetics Node bandwidth limit, your monitor will still have its bandwidth capped."
        />
      </EuiCallOut>
    </>
  );
};

export const ThrottlingExceededMessage = ({
  throttlingField,
  limit,
}: {
  throttlingField: string;
  limit: number;
}) => {
  return (
    <FormattedMessage
      id="xpack.synthetics.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.throttling_exceeded.message"
      defaultMessage="You have exceeded the { throttlingField } limit for Synthetic Nodes. The { throttlingField } value can't be larger than { limit }Mbps."
      values={{ throttlingField, limit }}
    />
  );
};
