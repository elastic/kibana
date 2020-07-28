/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ExampleContext } from '../../test/context_example';

// @ts-expect-error
import { image } from '../../../canvas_plugin_src/renderers/image';
import { sharedWorkpads } from '../../test';
import { RenderedElement, RenderedElementComponent } from '../rendered_element';

const { austin, hello } = sharedWorkpads;

storiesOf('shareables/RenderedElement', module)
  .add('contextual: hello', () => (
    <ExampleContext style={{ height: 720 }}>
      <RenderedElement element={hello.pages[0].elements[0]} index={0} />
    </ExampleContext>
  ))
  .add('contextual: austin', () => (
    <ExampleContext style={{ height: 720, background: '#000' }}>
      <RenderedElement element={austin.pages[0].elements[0]} index={0} />
    </ExampleContext>
  ))
  .add('component', () => (
    <ExampleContext style={{ height: 100, width: 100 }}>
      <RenderedElementComponent
        index={0}
        fn={image()}
        element={{
          id: '123',
          position: {
            left: 0,
            top: 0,
            height: 100,
            width: 100,
            angle: 0,
            parent: null,
          },
          expressionRenderable: {
            state: 'ready',
            value: {
              type: 'render',
              as: 'image',
              value: {
                type: 'image',
                mode: 'contain',
                dataurl:
                  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NC42MiA1MS4wMyI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiNmZmY7fS5jbHMtMSwuY2xzLTJ7c3Ryb2tlOiNmMzY7c3Ryb2tlLW1pdGVybGltaXQ6MTA7c3Ryb2tlLXdpZHRoOjJweDt9LmNscy0ye2ZpbGw6bm9uZTt9PC9zdHlsZT48L2RlZnM+PHRpdGxlPkZsYWcgSWNvbjwvdGl0bGU+PGcgaWQ9IkxheWVyXzIiIGRhdGEtbmFtZT0iTGF5ZXIgMiI+PGcgaWQ9IkxheWVyXzEtMiIgZGF0YS1uYW1lPSJMYXllciAxIj48cG9seWdvbiBjbGFzcz0iY2xzLTEiIHBvaW50cz0iNDIuOTMgMjguMTUgMSAyOC4xNSAxIDEgNDIuOTMgMSAzNS40NyAxNC41OCA0Mi45MyAyOC4xNSIvPjxsaW5lIGNsYXNzPSJjbHMtMiIgeDE9IjEiIHkxPSIxIiB4Mj0iMSIgeTI9IjUxLjAzIi8+PC9nPjwvZz48L3N2Zz4=',
              },
              css: '.canvasRenderEl{\n\n}',
              containerStyle: {
                type: 'containerStyle',
                overflow: 'hidden',
              },
            },
            error: null,
          },
        }}
      />
    </ExampleContext>
  ));
