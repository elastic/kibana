/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { flow } from '../';
import { Render } from '../../__stories__/render';
import { Shape } from '../../../functions/common/flow';

storiesOf('renderers/flow', module).add('default', () => {
  const config = {
    type: 'flow' as 'flow',
    border: '#FFEEDD',
    borderWidth: 8,
    shape: Shape.SQUARE,
    fill: '#112233',
    maintainAspect: true,
  };

  return <Render renderer={flow} config={config} />;
});
