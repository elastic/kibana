/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';

export const CannotEditCallout: FC<{ jobId: string }> = ({ jobId }) => (
  <>
    <EuiCallOut
      color="warning"
      iconType="help"
      title={i18n.translate('xpack.ml.management.spacesSelectorFlyout.cannotEditCallout.title', {
        defaultMessage: 'Insufficient permissions to edit spaces for {jobId}',
        values: { jobId },
      })}
    >
      <FormattedMessage
        id="xpack.ml.management.spacesSelectorFlyout.cannotEditCallout.text"
        defaultMessage="This job cannot be moved as it is in the * space and you do not have permission to see all spaces. Please log in as a user who had permission to see all spaces to perform this action."
      />
    </EuiCallOut>
    <EuiSpacer size="l" />
  </>
);
