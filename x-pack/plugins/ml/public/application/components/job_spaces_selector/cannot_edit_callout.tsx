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
        defaultMessage="To change the spaces for this job, you need authority to modify jobs in all spaces. Contact your system administrator for more information."
      />
    </EuiCallOut>
    <EuiSpacer size="l" />
  </>
);
