/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { waitFor } from '@kbn/presentation-util-plugin/public/__stories__';
import { getElasticLogo } from '@kbn/presentation-util-plugin/common';
import { CustomElementModal } from '../custom_element_modal';

export default {
  title: 'components/Elements/CustomElementModal',
};

export const WithTitle = () => (
  <CustomElementModal
    title="Create new element"
    onCancel={action('onCancel')}
    onSave={action('onSave')}
  />
);

WithTitle.story = {
  name: 'with title',
};

export const WithName = () => (
  <CustomElementModal
    title="Edit custom element"
    name="My Chart"
    description=""
    onCancel={action('onCancel')}
    onSave={action('onSave')}
  />
);

WithName.story = {
  name: 'with name',
};

export const WithDescription = () => (
  <CustomElementModal
    title="Edit custom element"
    description="best element ever"
    onCancel={action('onCancel')}
    onSave={action('onSave')}
  />
);

WithDescription.story = {
  name: 'with description',
};

export const WithImage = (_, props) => (
  <CustomElementModal
    title="Edit custom element"
    image={props?.elasticLogo}
    onCancel={action('onCancel')}
    onSave={action('onSave')}
  />
);

WithImage.story = {
  name: 'with image',
  decorators: [waitFor(getElasticLogo())],
};
