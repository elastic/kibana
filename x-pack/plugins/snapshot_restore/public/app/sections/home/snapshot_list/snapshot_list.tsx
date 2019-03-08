/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';

import { AppContext } from '../../../services/app_context';

export class SnapshotList extends PureComponent {
  public static contextType = AppContext;
  public context!: React.ContextType<typeof AppContext>;

  public render() {
    return <div>List of snapshots</div>;
  }
}
