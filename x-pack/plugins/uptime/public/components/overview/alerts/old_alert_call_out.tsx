/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  isOldAlert: boolean;
}

export const OldAlertCallOut: React.FC<Props> = ({ isOldAlert }) => {
  if (!isOldAlert) return null;
  return (
    <>
      <EuiSpacer size="m" />

      <EuiCallOut
        size="s"
        title={
          <FormattedMessage
            id="xpack.uptime.alerts.monitorStatus.oldAlertCallout.title"
            defaultMessage="You may be editing an older alert, some fields may not auto-populate."
          />
        }
        iconType="alert"
      />
    </>
  );
};
