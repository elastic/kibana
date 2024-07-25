/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { v4 } from 'uuid';
import { ChromeOption } from '@kbn/investigate-plugin/public';
import { InvestigateWidgetGrid as Component, InvestigateWidgetGridItem } from '.';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';
import { TimelineUserPrompt, TimelineAssistantResponse } from '../timeline_message';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Organisms/InvestigateWidgetGrid',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

function WithPersistedChanges(props: React.ComponentProps<typeof Component>) {
  const [items, setItems] = useState(props.items);

  return (
    <Component
      {...props}
      onItemsChange={async (nextItems) => {
        setItems(() => nextItems);
      }}
      onItemCopy={async (item) => {
        setItems((prevItems) =>
          prevItems.concat({
            ...item,
            id: v4(),
          })
        );
      }}
      onItemDelete={async (item) => {
        setItems((prevItems) => prevItems.filter((currentItem) => currentItem.id !== item.id));
      }}
      items={items}
    />
  );
}

const defaultProps: ComponentStoryObj<typeof Component> = {
  args: {},
  render: (props) => (
    <div style={{ maxWidth: 1200 }}>
      <WithPersistedChanges {...props} />
    </div>
  ),
};

function createItem<T extends Partial<InvestigateWidgetGridItem>>(overrides: T) {
  return {
    ...overrides,
    id: v4(),
    columns: 4,
    rows: 2,
    description: '',
    locked: false,
    loading: false,
    overrides: [],
  };
}

export const InvestigateWidgetGridStory: ComponentStoryObj<typeof Component> = {
  ...defaultProps,
  args: {
    ...defaultProps.args,
    items: [
      createItem({
        title: '5',
        description: '',
        element: (
          <TimelineUserPrompt
            prompt="I asked for something"
            user={{ username: 'me' }}
            onDelete={() => {}}
          />
        ),
        columns: 4,
        rows: 2,
        chrome: ChromeOption.disabled,
      }),
      createItem({
        title: '1',
        element: (
          <div style={{ backgroundColor: 'red', height: 1200, width: 1200 }}>
            This should not overflow
          </div>
        ),
        columns: 4,
        rows: 12,
        locked: true,
      }),
      createItem({
        title: '5',
        element: (
          <TimelineAssistantResponse
            content="I gave you something in response"
            onDelete={() => {}}
          />
        ),
        columns: 4,
        rows: 2,
        chrome: ChromeOption.disabled,
      }),
      createItem({
        title: '2',
        element: <>TODO</>,
        columns: 2,
        rows: 3,
        overrides: [
          {
            id: v4(),
            label: '4 hours earlier',
          },
          {
            id: v4(),
            label: 'service.name:opbeans-java AND service.enviroment:(production OR development)',
          },
        ],
      }),
      createItem({
        title: '3',
        element: <>TODO</>,
        columns: 2,
        rows: 3,
      }),
      createItem({
        title: '4',
        element: <>TODO</>,
        columns: 4,
        rows: 3,
      }),
    ],
  },
  name: 'default',
};
