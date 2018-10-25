/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';

import { ColumnarPage } from '../../components/page';

const Home: React.SFC = () => (
  <ColumnarPage>
    <h1>Hello Sec Ops</h1>
  </ColumnarPage>
);

export const HomePage = pure(Home);
