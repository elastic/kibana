/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { Debug } from '../debug';
import { largePayload, smallPayload } from './helpers';

storiesOf('components/Elements/Debug', module)
  .add('small payload', () => <Debug payload={smallPayload} />)
  .add('large payload', () => <Debug payload={largePayload} />);
