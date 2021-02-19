/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { DrilldownForm } from '.';
import { ActionFactory, BaseActionFactoryContext } from '../../../../dynamic_actions';
import { reactToUiComponent } from '../../../../../../../../src/plugins/kibana_react/public';

const factory: ActionFactory = ({
  ReactCollectConfig: () => <div>collect config</div>,
  CollectConfig: reactToUiComponent(() => <div>collect config</div>),
  id: 'TEST',
  isConfigValid: () => true,
  create: () => ({
    id: 'TEST_ACTION',
    execute: async () => {},
  }),
  createConfig: () => ({}),
  supportedTriggers: () => ['RANGE_SELECT_TRIGGER'],
  def: {} as any,
  deps: {} as any,
  getDisplayName: () => 'Display name',
  getDisplayNameTooltip: () => 'Display name tooltip',
  getIconType: () => 'link',
  isBeta: false,
  isCompatible: async () => true,
  isCompatibleLicense: () => true,
  order: 1,
} as unknown) as ActionFactory;

storiesOf('components/DrilldownForm', module).add('default', () => {
  return (
    <DrilldownForm
      actionFactory={factory}
      context={{} as BaseActionFactoryContext}
      name={'...'}
      onNameChange={action('onNameChange')}
      triggers={['RANGE_SELECT_TRIGGER']}
    />
  );
});
