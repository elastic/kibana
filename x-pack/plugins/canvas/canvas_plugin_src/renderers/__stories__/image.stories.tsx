/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { image } from '../image';
import { Render } from './render';
import { elasticLogo } from '../../lib/elastic_logo';

storiesOf('renderers/image', module).add('default', () => {
  const config = {
    type: 'image' as 'image',
    mode: 'cover',
    dataurl: elasticLogo,
  };

  return <Render renderer={image} config={config} width="400px" />;
});
