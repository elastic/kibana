/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ExampleContext } from '../../../test/context_example';

import { Footer } from '../footer';

storiesOf('shareables/Footer', module)
  .add('contextual: hello', () => (
    <ExampleContext height={172} source="hello">
      <Footer />
    </ExampleContext>
  ))
  .add('contextual: austin', () => (
    <ExampleContext height={172} source="austin">
      <Footer />
    </ExampleContext>
  ));
