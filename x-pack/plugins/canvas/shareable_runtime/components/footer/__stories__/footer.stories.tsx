import React from 'react';
import { ExampleContext } from '../../../test/context_example';

import { Footer } from '../footer';

export default {
  title: 'shareables/Footer',
};

export const ContextualHello = () => (
  <ExampleContext height={172} source="hello">
    <Footer />
  </ExampleContext>
);

ContextualHello.story = {
  name: 'contextual: hello',
};

export const ContextualAustin = () => (
  <ExampleContext height={172} source="austin">
    <Footer />
  </ExampleContext>
);

ContextualAustin.story = {
  name: 'contextual: austin',
};
