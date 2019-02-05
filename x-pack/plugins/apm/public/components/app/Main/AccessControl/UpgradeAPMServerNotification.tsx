/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';

const UPGRADE_APM_SERVER_URL =
  'https://www.elastic.co/guide/en/apm/server/current/upgrading.html';

interface Props {
  version: string;
}

export const UpgradeAPMServerNotification = ({ version }: Props) => (
  <EuiEmptyPrompt
    iconType="alert"
    iconColor="warning"
    title={<h1>Pending APM Server upgrade</h1>}
    body={
      <p>
        It looks like you're running an older version of APM Server ({version}).
        Please upgrade to 7.0 or higher in order to
        browse&nbsp;your&nbsp;APM&nbsp;data&nbsp;again.
      </p>
    }
    actions={[
      <EuiButton href={UPGRADE_APM_SERVER_URL} iconType="help">
        Upgrade APM Server
      </EuiButton>
    ]}
  />
);
