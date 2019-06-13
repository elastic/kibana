/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { FormattedDuration } from '..';

storiesOf('components/FormattedDuration', module)
  .add('1ms', () => <FormattedDuration maybeDurationNanoseconds={1e6} tooltipTitle="Hello world" />)
  .add('10ms', () => (
    <FormattedDuration maybeDurationNanoseconds={10e6} tooltipTitle="Hello world" />
  ))
  .add('1000ms', () => (
    <FormattedDuration maybeDurationNanoseconds={1000e6} tooltipTitle="Hello world" />
  ));
