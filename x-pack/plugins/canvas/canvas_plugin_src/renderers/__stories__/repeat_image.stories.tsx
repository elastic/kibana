/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { storiesOf } from '@storybook/react';
import { repeatImage } from '../repeat_image';
import { Render } from './render';
import { elasticLogo } from '../../lib/elastic_logo';
import { elasticOutline } from '../../lib/elastic_outline';

storiesOf('renderers/repeatImage', module).add('default', () => {
  const config = {
    count: 42,
    image: elasticLogo,
    size: 20,
    max: 60,
    emptyImage: elasticOutline,
  };

  return <Render renderer={repeatImage} config={config} width="400px" />;
});
