/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { reduxDecorator } from '../../../../storybook';
import { WorkpadFilters } from '../workpad_filters';
import { elementWithGroup, elements } from './elements';

storiesOf('components/WorkpadFilters/WorkpadFilters', module)
  .addDecorator((story) => (
    <div>
      <div className="canvasLayout__sidebar">
        <div style={{ width: '100%' }}>{story()}</div>
      </div>
    </div>
  ))
  .addDecorator(reduxDecorator({ elements }))
  .add('redux: default', () => <WorkpadFilters />)
  .add('redux: selected element with group', () => <WorkpadFilters element={elementWithGroup} />);
