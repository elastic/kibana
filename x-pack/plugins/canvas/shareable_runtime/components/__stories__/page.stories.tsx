import React from 'react';
import { ExampleContext } from '../../test/context_example';

import { Page, PageComponent } from '../page';
import { sharedWorkpads } from '../../test';
const { austin } = sharedWorkpads;

export default {
  title: 'shareables/Page',
};

export const ContextualAustin = () => (
  <ExampleContext source="austin" style={{ height: 720 }}>
    <Page index={3} />
  </ExampleContext>
);

ContextualAustin.story = {
  name: 'contextual: austin',
};

export const ContextualHello = () => (
  <ExampleContext source="hello" style={{ height: 720 }}>
    <Page index={0} />
  </ExampleContext>
);

ContextualHello.story = {
  name: 'contextual: hello',
};

export const Component = () => (
  <ExampleContext source="austin" style={{ height: 720 }}>
    <PageComponent height={720} width={1280} page={austin.pages[3]} />
  </ExampleContext>
);

Component.story = {
  name: 'component',
};
