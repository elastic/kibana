/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { mlNodesAvailable, permissionToViewMlNodeCount } from 'plugins/ml/ml_nodes_check/check_ml_nodes';

import React from 'react';

import {
  EuiCallOut,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';

export function NodeAvailableWarning() {
  const isCloud = false; // placeholder for future specific cloud functionality
  if ((mlNodesAvailable() === true) || (permissionToViewMlNodeCount() === false)) {
    return (<span />);
  } else {
    return (
      <React.Fragment>
        <EuiCallOut
          title="No ML nodes available"
          color="warning"
          iconType="alert"
        >
          <p>
            There are no ML nodes available.<br />
            You will not be able to create or run jobs.
            {isCloud &&
              <span ng-if="isCloud">
                &nbsp;This can be configured in Cloud <EuiLink href="#">here</EuiLink>.
              </span>
            }
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </React.Fragment>
    );
  }
}
