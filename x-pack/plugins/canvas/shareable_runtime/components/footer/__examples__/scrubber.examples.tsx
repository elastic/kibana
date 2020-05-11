/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';

import { CanvasRenderedPage } from '../../../types';
import { ExampleContext } from '../../../test/context_example';
import { Scrubber, ScrubberComponent } from '../scrubber';
import { workpads } from '../../../../__tests__/fixtures/workpads';

storiesOf('shareables/Footer/Scrubber', module)
  .add('contextual: hello', () => (
    <ExampleContext source="hello" style={{ height: 172 }} isScrubberVisible={true}>
      <Scrubber />
    </ExampleContext>
  ))
  .add('contextual: austin', () => (
    <ExampleContext source="austin" style={{ height: 172 }} isScrubberVisible={true}>
      <Scrubber />
    </ExampleContext>
  ))
  .add('component', () => (
    <ExampleContext style={{ height: 172 }}>
      <ScrubberComponent
        isScrubberVisible={true}
        pages={(workpads[0].pages as unknown) as CanvasRenderedPage[]}
      />
    </ExampleContext>
  ));
