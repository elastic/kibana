/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';

import { workpads } from '../../../../__fixtures__/workpads';
import { ExampleContext } from '../../../test/context_example';
import { CanvasRenderedPage } from '../../../types';
import { Scrubber, ScrubberComponent } from '../scrubber';

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
        pages={workpads[0].pages as unknown as CanvasRenderedPage[]}
      />
    </ExampleContext>
  ));
