/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 TODO: uncomment and fix this test to address storybook errors as a result of nested component dependencies - https://github.com/elastic/kibana/issues/58289
 */

/*
import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { Toolbar } from '../toolbar';

storiesOf('components/Toolbar', module)
  .addDecorator(story => (
    <div
      style={{
        width: '200px',
      }}
    >
      {story()}
    </div>
  ))
  .add('with null metric', () => (
    <Toolbar
      setTray={action('setTray')}
      nextPage={action('nextPage')}
      previousPage={action('previousPage')}
      setShowWorkpadManager={action('setShowWorkpadManager')}
      selectedPageNumber={1}
      totalPages={1}
      showWorkpadManager={false}
      isWriteable={true}
    />
  ));
*/
