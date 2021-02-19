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
import type { TriggerPickerProps } from '../trigger_picker';
import { ActionFactory, BaseActionFactoryContext } from '../../../../dynamic_actions';
import { reactToUiComponent } from '../../../../../../../../src/plugins/kibana_react/public';

const triggers: TriggerPickerProps = {
  items: [
    {
      id: 'RANGE_SELECT_TRIGGER',
      title: 'Range selected',
      description: 'On chart brush.',
    },
    {
      id: 'VALUE_CLICK_TRIGGER',
      title: 'Value click',
      description: 'On point click in chart',
    },
  ],
  selected: ['RANGE_SELECT_TRIGGER'],
  docs: 'http://example.com',
  onChange: () => {},
};

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
  getDisplayName: () => 'Go to Discover',
  getDisplayNameTooltip: () => 'This is Discover drilldown',
  getIconType: () => 'discoverApp',
  isBeta: false,
  isCompatible: async () => true,
  isCompatibleLicense: () => true,
  order: 1,
} as unknown) as ActionFactory;

storiesOf('components/DrilldownForm', module)
  .add('Default', () => {
    return (
      <DrilldownForm
        actionFactory={factory}
        context={{} as BaseActionFactoryContext}
        name={'...'}
        euiIconType={'discoverApp'}
        drilldownTypeName={'Go to Discover'}
        triggers={triggers}
        onNameChange={action('onNameChange')}
        onTypeChange={action('onTypeChange')}
      >
        children...
      </DrilldownForm>
    );
  })
  .add('With license link', () => {
    return (
      <DrilldownForm
        actionFactory={factory}
        context={{} as BaseActionFactoryContext}
        name={'...'}
        euiIconType={'discoverApp'}
        drilldownTypeName={'Go to Discover'}
        triggers={triggers}
        showMoreActionsLink
        onNameChange={action('onNameChange')}
        onTypeChange={action('onTypeChange')}
      >
        children...
      </DrilldownForm>
    );
  })
  .add('No triggers', () => {
    return (
      <DrilldownForm
        actionFactory={factory}
        context={{} as BaseActionFactoryContext}
        name={'...'}
        euiIconType={'discoverApp'}
        drilldownTypeName={'Go to Discover'}
        triggers={{
          items: [],
          selected: ['RANGE_SELECT_TRIGGER'],
          docs: 'http://example.com',
          onChange: () => {},
        }}
        showMoreActionsLink
        onNameChange={action('onNameChange')}
        onTypeChange={action('onTypeChange')}
      >
        children...
      </DrilldownForm>
    );
  });
