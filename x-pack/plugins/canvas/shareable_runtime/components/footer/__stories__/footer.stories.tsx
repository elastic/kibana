import React from 'react';
import { ExampleContext } from '../../../test/context_example';

import { Footer } from '../footer';

export default {
  title: 'shareables/Footer',
};

export const ContextualHello = {
  render: () => (
    <ExampleContext height={172} source="hello">
      <Footer />
    </ExampleContext>
  ),

  name: 'contextual: hello',
};

export const ContextualAustin = {
  render: () => (
    <ExampleContext height={172} source="austin">
      <Footer />
    </ExampleContext>
  ),

  name: 'contextual: austin',
};
