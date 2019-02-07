/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import { noop } from 'lodash/fp';
import { get } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { Body } from '.';
import { Direction } from '../../../graphql/types';
import { mockEcsData } from '../../../mock';
import { createStore } from '../../../store';
import { defaultHeaders } from './column_headers/headers';
import { columnRenderers, rowRenderers } from './renderers';

const testBodyHeight = 700;
const mockGetNotesByIds = (eventId: string[]) => [];

describe('ColumnHeaders', () => {
  describe('rendering', () => {
    test('it renders each column of data (NOTE: this test omits timestamp, which is a special case tested below)', () => {
      const store = createStore();
      const headersSansTimestamp = defaultHeaders.filter(h => h.id !== 'timestamp');

      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <Body
                addNoteToEvent={noop}
                id={'timeline-test'}
                columnHeaders={headersSansTimestamp}
                columnRenderers={columnRenderers}
                data={mockEcsData}
                eventIdToNoteIds={{}}
                height={testBodyHeight}
                getNotesByIds={mockGetNotesByIds}
                onColumnSorted={noop}
                onFilterChange={noop}
                onPinEvent={noop}
                onRangeSelected={noop}
                onUnPinEvent={noop}
                pinnedEventIds={{}}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                sort={{
                  columnId: 'timestamp',
                  sortDirection: Direction.descending,
                }}
                updateNote={noop}
              />
            </DragDropContext>
          </ReduxStoreProvider>
        </ThemeProvider>
      );

      headersSansTimestamp.forEach(h => {
        expect(
          wrapper
            .find('[data-test-subj="data-driven-columns"]')
            .first()
            .text()
        ).toContain(get(h.id, mockEcsData[0]));
      });
    });

    test('it renders a non-formatted timestamp', () => {
      const store = createStore();
      const headersJustTimestamp = defaultHeaders.filter(h => h.id === 'timestamp');

      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <Body
                addNoteToEvent={noop}
                id={'timeline-test'}
                columnHeaders={headersJustTimestamp}
                columnRenderers={columnRenderers}
                data={mockEcsData}
                eventIdToNoteIds={{}}
                height={testBodyHeight}
                getNotesByIds={mockGetNotesByIds}
                onColumnSorted={noop}
                onFilterChange={noop}
                onPinEvent={noop}
                onRangeSelected={noop}
                onUnPinEvent={noop}
                pinnedEventIds={{}}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                sort={{
                  columnId: 'timestamp',
                  sortDirection: Direction.descending,
                }}
                updateNote={noop}
              />
            </DragDropContext>
          </ReduxStoreProvider>
        </ThemeProvider>
      );

      headersJustTimestamp.forEach(h => {
        expect(
          wrapper
            .find('[data-test-subj="data-driven-columns"]')
            .first()
            .text()
        ).toEqual(get(h.id, mockEcsData[0]));
      });
    });

    test('it renders a tooltip for timestamp', () => {
      const store = createStore();
      const headersJustTimestamp = defaultHeaders.filter(h => h.id === 'timestamp');

      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <Body
                addNoteToEvent={noop}
                id={'timeline-test'}
                columnHeaders={headersJustTimestamp}
                columnRenderers={columnRenderers}
                data={mockEcsData}
                eventIdToNoteIds={{}}
                height={testBodyHeight}
                getNotesByIds={mockGetNotesByIds}
                onColumnSorted={noop}
                onFilterChange={noop}
                onPinEvent={noop}
                onRangeSelected={noop}
                onUnPinEvent={noop}
                pinnedEventIds={{}}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                sort={{
                  columnId: 'timestamp',
                  sortDirection: Direction.descending,
                }}
                updateNote={noop}
              />
            </DragDropContext>
          </ReduxStoreProvider>
        </ThemeProvider>
      );

      headersJustTimestamp.forEach(h => {
        expect(
          wrapper
            .find('[data-test-subj="data-driven-columns"]')
            .first()
            .find('[data-test-subj="timeline-event-timestamp-tool-tip"]')
            .exists()
        ).toEqual(true);
      });
    });
  });
});
