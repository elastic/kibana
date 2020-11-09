/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { ExampleContext } from '../../test/context_example';

import { Page, PageComponent } from '../page';
import { sharedWorkpads } from '../../test';
const { austin } = sharedWorkpads;

storiesOf('shareables/Page', module)
  .add('contextual: austin', () => (
    <ExampleContext source="austin" style={{ height: 720 }}>
      <Page index={3} />
    </ExampleContext>
  ))
  .add('contextual: hello', () => (
    <ExampleContext source="hello" style={{ height: 720 }}>
      <Page index={0} />
    </ExampleContext>
  ))
  .add('component', () => (
    <ExampleContext source="austin" style={{ height: 720 }}>
      <PageComponent height={720} width={1280} page={austin.pages[3]} />
    </ExampleContext>
  ));
