/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { storiesOf } from '@storybook/react';
import { revealImage } from '../';
import { Render } from '../../__stories__/render';
import { elasticOutline } from '../../../lib/elastic_outline';
import { elasticLogo } from '../../../lib/elastic_logo';
import { Origin } from '../../../functions/common/revealImage';

storiesOf('renderers/revealImage', module).add('default', () => {
  const config = {
    image: elasticLogo,
    emptyImage: elasticOutline,
    origin: Origin.LEFT,
    percent: 0.45,
  };

  return <Render renderer={revealImage} config={config} />;
});
