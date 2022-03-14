/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* istanbul ignore file */

import React, { useState } from 'react';

import {
  EuiSpacer,
  EuiPageHeader,
  EuiTitle,
  EuiPageContentBody,
  EuiPageContent,
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiButtonIconColor,
  EuiEmptyPrompt,
} from '@elastic/eui';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Schema, SchemaType } from '../../../shared/schema/types';
import { InlineEditableTable } from '../../../shared/tables/inline_editable_table';
import { ReorderableTable } from '../../../shared/tables/reorderable_table';
import { Result } from '../result';

const NO_ITEMS = (
  <EuiEmptyPrompt iconType="clock" title={<h2>No Items</h2>} body={<p>No Items</p>} />
);

// For the InlineEditableTable
// Since InlineEditableTable caches handlers, we need to store this globally somewhere rather than just in useState
interface Foo {
  id: number;
  foo: string;
  bar: string;
}
let globalItems: Foo[] = [];
const getLastItems = () => globalItems;

export const Library: React.FC = () => {
  const props = {
    isMetaEngine: false,
    result: {
      id: {
        raw: '1',
      },
      _meta: {
        id: '1',
        score: 100,
        engine: 'my-engine',
      },
      title: {
        raw: 'A title',
      },
      description: {
        raw: 'A description',
      },
      date_established: {
        raw: '1968-10-02T05:00:00Z',
      },
      location: {
        raw: '37.3,-113.05',
      },
      visitors: {
        raw: 1000,
      },
      states: {
        raw: ['Pennsylvania', 'Ohio'],
      },
      size: {
        raw: 200,
      },
      length: {
        raw: 100,
      },
    },
  };

  const schema: Schema = {
    title: SchemaType.Text,
    description: SchemaType.Text,
    date_established: SchemaType.Date,
    location: SchemaType.Geolocation,
    states: SchemaType.Text,
    visitors: SchemaType.Number,
    size: SchemaType.Number,
    length: SchemaType.Number,
  };

  const [isActionButtonFilled, setIsActionButtonFilled] = useState(false);
  const actions = [
    {
      title: 'Fill this action button',
      onClick: () => setIsActionButtonFilled(!isActionButtonFilled),
      iconType: isActionButtonFilled ? 'starFilled' : 'starEmpty',
      iconColor: 'primary' as EuiButtonIconColor,
    },
  ];

  // For the InlineEditableTable
  const [items, setItems] = useState([
    { id: 1, foo: 'foo1', bar: '10' },
    { id: 2, foo: 'foo2', bar: '10' },
  ]);
  globalItems = items;
  const columns = [
    {
      field: 'foo',
      name: 'Foo',
      render: (item: Foo) => <div>{item.foo}</div>,
      editingRender: (item: Foo, onChange: (value: string) => void) => (
        <input type="text" value={item.foo} onChange={(e) => onChange(e.target.value)} />
      ),
    },
    {
      field: 'bar',
      name: 'Bar (Must be a number)',
      render: (item: Foo) => <div>{item.bar}</div>,
      editingRender: (item: Foo, onChange: (value: string) => void) => (
        <input type="text" value={item.bar} onChange={(e) => onChange(e.target.value)} />
      ),
    },
  ];
  const onAdd = (item: Foo, onSuccess: () => void) => {
    const highestId = Math.max(...getLastItems().map((i) => i.id));
    setItems([
      ...getLastItems(),
      {
        ...item,
        id: highestId + 1,
      },
    ]);
    onSuccess();
  };
  const onDelete = (item: Foo) => {
    setItems(getLastItems().filter((i) => i.id !== item.id));
  };
  const onUpdate = (item: Foo, onSuccess: () => void) => {
    setItems(
      getLastItems().map((i) => {
        if (item.id === i.id) return item;
        return i;
      })
    );
    onSuccess();
  };
  const validateItem = (item: Foo) => {
    let isValidNumber = false;
    const num = parseInt(item.bar, 10);
    if (!isNaN(num)) isValidNumber = true;

    if (isValidNumber) return {};
    return {
      bar: 'Bar must be a valid number',
    };
  };
  const onReorder = (newItems: Foo[]) => {
    setItems(newItems);
  };

  return (
    <>
      <SetPageChrome trail={['Library']} />
      <EuiPageHeader pageTitle="Library" />
      <EuiPageContent hasBorder>
        <EuiPageContentBody>
          <EuiTitle size="m">
            <h2>Result</h2>
          </EuiTitle>
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>5 or more fields</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result {...props} />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>5 or less fields</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result
            {...{
              ...props,
              result: {
                id: props.result.id,
                _meta: props.result._meta,
                title: props.result.title,
                description: props.result.description,
              },
            }}
          />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>With just an id</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result
            {...{
              ...props,
              result: {
                ...props.result,
                _meta: {
                  id: '1',
                  score: 100,
                  engine: 'my-engine',
                },
              },
            }}
          />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>With an id and a score</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result
            {...{
              ...props,
              showScore: true,
              result: {
                ...props.result,
                _meta: {
                  id: '1',
                  score: 100,
                  engine: 'my-engine',
                },
              },
            }}
          />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>With a document position</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result
            {...{
              ...props,
              resultPosition: 3,
              result: {
                ...props.result,
                _meta: {
                  id: '1',
                  score: 100,
                  engine: 'my-engine',
                },
              },
            }}
          />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>With an id and a score and an engine</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result
            {...{
              ...props,
              isMetaEngine: true,
              showScore: true,
              result: {
                ...props.result,
                _meta: {
                  id: '1',
                  score: 100,
                  engine: 'my-engine',
                },
              },
            }}
          />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>With a long id, a long engine name, a long field key, and a long value</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result
            {...{
              ...props,
              isMetaEngine: true,
              result: {
                ...props.result,
                'this-description-is-a-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-long-key':
                  {
                    raw: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                  },
                _meta: {
                  id: 'my-id-is-a-really-long-id-yes-it-is',
                  score: 100,
                  engine: 'my-engine-is-a-really-long-engin-name-yes-it-is',
                },
              },
            }}
          />

          <EuiSpacer />
          <EuiTitle size="s">
            <h3>With a link</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result {...props} shouldLinkToDetailPage />
          <EuiSpacer />

          <EuiSpacer />
          <EuiTitle size="s">
            <h3>With custom actions</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result {...props} actions={actions} />
          <EuiSpacer />

          <EuiSpacer />
          <EuiTitle size="s">
            <h3>With custom actions and a link</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result {...props} actions={actions} shouldLinkToDetailPage showScore isMetaEngine />
          <EuiSpacer />

          <EuiSpacer />
          <EuiTitle size="s">
            <h3>With a drag handle</h3>
          </EuiTitle>
          <EuiSpacer />
          <EuiDragDropContext onDragEnd={() => {}}>
            <EuiDroppable spacing="m" droppableId="DraggableResultsTest">
              {[1, 2, 3].map((_, i) => (
                <EuiDraggable
                  spacing="m"
                  key={`draggable-${i}`}
                  index={i}
                  draggableId={`draggable-${i}`}
                  customDragHandle
                >
                  {(provided) => <Result {...props} dragHandleProps={provided.dragHandleProps} />}
                </EuiDraggable>
              ))}
            </EuiDroppable>
          </EuiDragDropContext>
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>With field value type highlights</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result {...props} schemaForTypeHighlights={schema} />
          <EuiSpacer />

          <EuiTitle size="m">
            <h2>ReorderableTable</h2>
          </EuiTitle>
          <EuiSpacer />

          <ReorderableTable
            noItemsMessage={NO_ITEMS}
            items={[{ id: 1 }, { id: 2 }, { id: 3 }]}
            columns={[
              { name: 'ID', render: (item) => <div>{item.id}</div> },
              { name: 'Whatever', render: () => <div>Whatever</div> },
            ]}
          />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>With reordering disabled</h3>
          </EuiTitle>
          <EuiSpacer />
          <ReorderableTable
            disableReordering
            noItemsMessage={NO_ITEMS}
            items={[{ id: 1 }, { id: 2 }, { id: 3 }]}
            columns={[
              { name: 'ID', render: (item) => <div>{item.id}</div> },
              { name: 'Whatever', render: () => <div>Whatever</div> },
            ]}
          />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>With reordering enabled, but dragging disabled</h3>
          </EuiTitle>
          <EuiSpacer />
          <ReorderableTable
            disableDragging
            noItemsMessage={NO_ITEMS}
            items={[{ id: 1 }, { id: 2 }, { id: 3 }]}
            columns={[
              { name: 'ID', render: (item) => <div>{item.id}</div> },
              { name: 'Whatever', render: () => <div>Whatever</div> },
            ]}
          />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>With unreorderable items</h3>
          </EuiTitle>
          <EuiSpacer />
          <ReorderableTable
            noItemsMessage={NO_ITEMS}
            items={[{ id: 1 }, { id: 2 }, { id: 3 }]}
            unreorderableItems={[{ id: 4 }, { id: 5 }]}
            columns={[
              { name: 'ID', render: (item) => <div>{item.id}</div> },
              { name: 'Whatever', render: () => <div>Whatever</div> },
            ]}
          />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>Using the rowProps prop to apply dynamic properties to each row</h3>
          </EuiTitle>
          <EuiSpacer />
          <ReorderableTable
            rowProps={(item) => ({
              style: {
                backgroundColor: item.id % 2 === 0 ? 'red' : 'green',
              },
            })}
            noItemsMessage={NO_ITEMS}
            items={[{ id: 1 }, { id: 2 }, { id: 3 }]}
            columns={[
              { name: 'ID', render: (item) => <div>{item.id}</div> },
              { name: 'Whatever', render: () => <div>Whatever</div> },
            ]}
          />

          <EuiSpacer />
          <EuiTitle size="s">
            <h3>With no items</h3>
          </EuiTitle>
          <EuiSpacer />
          <ReorderableTable
            noItemsMessage={NO_ITEMS}
            items={[]}
            columns={[
              { name: 'ID', render: (item: { id: number }) => <div>{item.id}</div> },
              { name: 'Whatever', render: () => <div>Whatever</div> },
            ]}
          />
          <EuiSpacer />

          <EuiTitle size="m">
            <h2>InlineEditableTable</h2>
          </EuiTitle>
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>With uneditable items</h3>
          </EuiTitle>
          <EuiSpacer />
          <InlineEditableTable
            items={items}
            uneditableItems={[{ id: 3, foo: 'foo', bar: 'bar' }]}
            instanceId="MyInstance"
            title="My table"
            description="Some description"
            columns={columns}
            onAdd={onAdd}
            onDelete={onDelete}
            onUpdate={onUpdate}
            validateItem={validateItem}
            onReorder={onReorder}
          />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>Can delete last item</h3>
          </EuiTitle>
          <EuiSpacer />
          <InlineEditableTable
            items={items}
            instanceId="MyInstance1"
            title="My table"
            description="Some description"
            columns={columns}
            onAdd={onAdd}
            onDelete={onDelete}
            onUpdate={onUpdate}
            validateItem={validateItem}
            onReorder={onReorder}
            canRemoveLastItem
            noItemsMessage={(edit) => {
              return (
                <EuiEmptyPrompt
                  iconType="clock"
                  title={<h2>No Items</h2>}
                  body={<button onClick={edit}>Click to create one</button>}
                />
              );
            }}
          />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>Cannot delete last item</h3>
          </EuiTitle>
          <EuiSpacer />
          <InlineEditableTable
            items={items}
            instanceId="MyInstance2"
            title="My table"
            description="Some description"
            columns={columns}
            onAdd={onAdd}
            onDelete={onDelete}
            onUpdate={onUpdate}
            validateItem={validateItem}
            onReorder={onReorder}
            canRemoveLastItem={false}
            lastItemWarning="This is the last item, you cannot delete it!"
          />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>When isLoading is true</h3>
          </EuiTitle>
          <EuiSpacer />
          <InlineEditableTable
            isLoading
            items={items}
            instanceId="MyInstance3"
            title="My table"
            description="Some description"
            columns={columns}
            onAdd={onAdd}
            onDelete={onDelete}
            onUpdate={onUpdate}
            validateItem={validateItem}
            onReorder={onReorder}
          />
          <EuiSpacer />

          <EuiSpacer />
          <EuiSpacer />
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};
