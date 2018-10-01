/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';

export function AddRoleAlert() {
  return (
    <p>
      <strong>Grant additional privileges. </strong>
      In Kibana Management, assign the <EuiCode>monitoring_user</EuiCode> role to your Kibana user.
    </p>
  );
}
