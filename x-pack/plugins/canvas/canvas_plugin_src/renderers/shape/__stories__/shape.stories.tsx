/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { storiesOf } from '@storybook/react';
import { shape } from '../';
import { Render } from '../../__stories__/render';
import { Shape } from '../../../functions/common/shape';

storiesOf('renderers/shape', module).add('default', () => {
  const config = {
    type: 'shape' as 'shape',
    border: '#FFEEDD',
    borderWidth: 8,
    shape: Shape.BOOKMARK,
    fill: '#112233',
    maintainAspect: true,
  };

  return <Render renderer={shape} config={config} />;
});
