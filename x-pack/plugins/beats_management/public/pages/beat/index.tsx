/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PrimaryLayout } from '../../components/layouts/primary';

export class BeatDetailsPage extends React.PureComponent {
  public render() {
    return (
      <PrimaryLayout title="Beat: ${id}" actionSection={null}>
        <div>beat details view</div>
      </PrimaryLayout>
    );
  }
}
