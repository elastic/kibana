/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
} from '@elastic/eui';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Schema, SchemaType } from '../../../shared/schema/types';
import { Result } from '../result';

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
                'this-description-is-a-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-really-long-key': {
                  raw:
                    'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
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

          <EuiSpacer />
          <EuiTitle size="s">
            <h3>With field value type highlights</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result {...props} schemaForTypeHighlights={schema} />
          <EuiSpacer />
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};
