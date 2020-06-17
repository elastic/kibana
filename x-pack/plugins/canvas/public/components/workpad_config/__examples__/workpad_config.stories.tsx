/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { handleActions } from 'redux-actions';

// @ts-ignore untyped local
import { getDefaultWorkpad } from '../../../../public/state/defaults';
import { WorkpadConfig } from '../';
import { WorkpadCSS } from '../workpad_css/workpad_css';
import { WorkpadSize } from '../workpad_size/workpad_size';

storiesOf('components/WorkpadConfig', module)
  .add('redux', () => (
    <div style={{ width: 325 }}>
      <WorkpadConfig />
    </div>
  ))
  .add('WorkpadCSS', () => (
    <div style={{ width: 325 }}>
      <WorkpadCSS setWorkpadCSS={action('setWorkpadCSS')} />
    </div>
  ))
  .add('WorkpadSize', () => (
    <div style={{ width: 325 }}>
      <WorkpadSize setSize={action('setSize')} size={{ height: 600, width: 800 }} />
    </div>
  ));
