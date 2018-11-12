/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton } from '@elastic/eui';
import React from 'react';
import { NoDataLayout } from '../../../components/layouts/no_data';
import { ConnectedLink } from '../../../components/navigation/connected_link';

export const InitialHelpPage = () => (
  <NoDataLayout
    title="Beats central management"
    actionSection={
      <ConnectedLink path="/overview/initial/beats">
        <EuiButton color="primary" fill>
          Enroll Beat
        </EuiButton>
      </ConnectedLink>
    }
  >
    <p>Manage your configurations in a central location.</p>
  </NoDataLayout>
);
