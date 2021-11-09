/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';

// @ts-expect-error
import { getDefaultPage } from '../../../state/defaults';
import { reduxDecorator } from '../../../../storybook';
import { Toolbar } from '../toolbar';

const pages = [...new Array(10)].map(() => getDefaultPage());

const Pages = ({ story }: { story: Function }) => (
  <div>
    {story()}
    <div style={{ visibility: 'hidden', position: 'absolute' }}>
      {pages.map((page, index) => (
        <div style={{ height: 66, width: 100, textAlign: 'center' }} id={page.id}>
          <h1 style={{ paddingTop: 22 }}>Page {index}</h1>
        </div>
      ))}
    </div>
  </div>
);

storiesOf('components/Toolbar', module)
  .addDecorator((story) => <Pages story={story} />)
  .addDecorator(reduxDecorator({ pages }))
  .add('redux', () => <Toolbar />);
