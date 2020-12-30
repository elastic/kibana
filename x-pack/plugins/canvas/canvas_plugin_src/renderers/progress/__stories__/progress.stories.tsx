/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { storiesOf } from '@storybook/react';
import { progress } from '../';
import { Render } from '../../__stories__/render';
import { Shape } from '../../../functions/common/progress';

storiesOf('renderers/progress', module).add('default', () => {
  const config = {
    barColor: '#bc1234',
    barWeight: 20,
    font: {
      css: '',
      spec: {},
      type: 'style' as 'style',
    },
    label: '66%',
    max: 1,
    shape: Shape.UNICORN,
    value: 0.66,
    valueColor: '#000',
    valueWeight: 15,
  };

  return <Render renderer={progress} config={config} />;
});
