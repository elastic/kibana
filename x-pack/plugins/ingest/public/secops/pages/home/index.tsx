/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ColumnarPage } from '../../../components/page';

export class HomePage extends React.PureComponent {
  public render() {
    return (
      <ColumnarPage>
        <h1>Hello SecOps</h1>
      </ColumnarPage>
    );
  }
}
