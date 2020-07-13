/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { WorkpadTemplates } from '../workpad_templates';
import { CanvasTemplate } from '../../../../types';

const templates: Record<string, CanvasTemplate> = {
  test1: {
    id: 'test1-id',
    name: 'test1',
    help: 'This is a test template',
    tags: ['tag1', 'tag2'],
    template_key: 'test1-key',
  },
  test2: {
    id: 'test2-id',
    name: 'test2',
    help: 'This is a second test template',
    tags: ['tag2', 'tag3'],
    template_key: 'test2-key',
  },
};

storiesOf('components/WorkpadTemplates', module)
  .addDecorator((story) => <div style={{ width: '500px' }}>{story()}</div>)
  .add('default', () => {
    const onCreateFromTemplateAction = action('onCreateFromTemplate');
    return (
      <WorkpadTemplates
        templates={templates}
        onClose={action('onClose')}
        onCreateFromTemplate={(template) => {
          onCreateFromTemplateAction(template);
          return Promise.resolve();
        }}
      />
    );
  });
