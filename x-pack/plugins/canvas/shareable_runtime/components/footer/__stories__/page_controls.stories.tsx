/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { ExampleContext } from '../../../test/context_example';
import { PageControls, PageControlsComponent } from '../page_controls';

const style = { background: '#333', padding: 10 };

storiesOf('shareables/Footer/PageControls', module)
  .add('contextual: hello', () => (
    <ExampleContext source="austin" {...{ style }}>
      <PageControls />
    </ExampleContext>
  ))
  .add('contextual: austin', () => (
    <ExampleContext source="austin" {...{ style }}>
      <PageControls />
    </ExampleContext>
  ))
  .add('component', () => (
    <div {...{ style }}>
      <PageControlsComponent
        page={0}
        totalPages={10}
        onSetPageNumber={action('onSetPageNumber')}
        onToggleScrubber={action('onToggleScrubber')}
      />
    </div>
  ));
