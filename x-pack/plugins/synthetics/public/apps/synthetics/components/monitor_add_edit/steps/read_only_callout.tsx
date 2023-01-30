/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const ReadOnlyCallout = () => {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.synthetics.browser.project.readOnly.callout.title"
          defaultMessage="Read only"
        />
      }
      iconType="document"
    >
      <p>
        <FormattedMessage
          id="xpack.synthetics.browser.project.readOnly.callout.content"
          defaultMessage="This monitor was added from an external project. Configuration is read only."
        />
      </p>
    </EuiCallOut>
  );
};
