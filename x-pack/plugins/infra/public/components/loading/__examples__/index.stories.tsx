/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { InfraLoadingPanel } from '..';

storiesOf('infra/InfraLoadingPanel', module).add('example', () => (
  <InfraLoadingPanel text="test" width={200} height={200} />
));
