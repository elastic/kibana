/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { image } from '../image';
import { getElasticLogo } from '../../../../../../src/plugins/presentation_util/common/lib';
import { waitFor } from '../../../../../../src/plugins/presentation_util/public/__stories__';
import { Render } from './render';

const Renderer = ({ elasticLogo }: { elasticLogo: string }) => {
  const config = {
    type: 'image' as 'image',
    mode: 'cover',
    dataurl: elasticLogo,
  };

  return <Render renderer={image} config={config} width="400px" />;
};

storiesOf('renderers/image', module).add(
  'default',
  (_, props) => <Renderer elasticLogo={props?.elasticLogo} />,
  { decorators: [waitFor(getElasticLogo())] }
);
