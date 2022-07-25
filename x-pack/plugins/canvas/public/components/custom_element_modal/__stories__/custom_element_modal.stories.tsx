/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { waitFor } from '@kbn/presentation-util-plugin/public/__stories__';
import { getElasticLogo } from '@kbn/presentation-util-plugin/public';
import { CustomElementModal } from '../custom_element_modal';

storiesOf('components/Elements/CustomElementModal', module)
  .add('with title', () => (
    <CustomElementModal
      title="Create new element"
      onCancel={action('onCancel')}
      onSave={action('onSave')}
    />
  ))
  .add('with name', () => (
    <CustomElementModal
      title="Edit custom element"
      name="My Chart"
      description=""
      onCancel={action('onCancel')}
      onSave={action('onSave')}
    />
  ))
  .add('with description', () => (
    <CustomElementModal
      title="Edit custom element"
      description="best element ever"
      onCancel={action('onCancel')}
      onSave={action('onSave')}
    />
  ))
  .add(
    'with image',
    (_, props) => (
      <CustomElementModal
        title="Edit custom element"
        image={props?.elasticLogo}
        onCancel={action('onCancel')}
        onSave={action('onSave')}
      />
    ),
    { decorators: [waitFor(getElasticLogo())] }
  );
