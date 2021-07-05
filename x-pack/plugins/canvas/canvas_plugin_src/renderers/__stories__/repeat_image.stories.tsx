/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { repeatImage } from '../repeat_image';
import { Render } from './render';
import {
  elasticLogo,
  elasticOutline,
} from '../../../../../../src/plugins/presentation_util/common/lib';

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
