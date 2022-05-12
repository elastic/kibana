/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const ManagedTransformsWarningCallout = ({
  count,
  action,
}: {
  count: number;
  action: string;
}) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut color="warning">
        <FormattedMessage
          id="xpack.transform.managedTransformsWarningCallout"
          defaultMessage="{count, plural, one {This transform} other {At least one of these transforms}} is preconfigured by Elastic; {action} {count, plural, one {it} other {them}} might impact other parts of the product."
          values={{
            count,
            action,
          }}
        />
      </EuiCallOut>
    </>
  );
};
