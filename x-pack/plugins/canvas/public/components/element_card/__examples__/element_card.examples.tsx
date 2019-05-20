/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ElementCard } from '../element_card';
import { elasticLogo } from '../../../lib/elastic_logo';

storiesOf('components/ElementCard', module)
  .addDecorator(story => (
    <div
      style={{
        width: '210px',
      }}
    >
      {story()}
    </div>
  ))
  .add('with title and description', () => (
    <ElementCard
      title="Element 1"
      description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce lobortis aliquet arcu ut turpis duis."
    />
  ))
  .add('with image', () => (
    <ElementCard
      title="Element 1"
      description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce lobortis aliquet arcu ut turpis duis."
      image={elasticLogo}
    />
  ))
  .add('with tags', () => (
    <ElementCard
      title="Element 1"
      description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce lobortis aliquet arcu ut turpis duis."
      tags={['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']}
      onClick={action('onClick')}
    />
  ))
  .add('with click handler', () => (
    <ElementCard
      title="Element 1"
      description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce lobortis aliquet arcu ut turpis duis."
      onClick={action('onClick')}
    />
  ));
