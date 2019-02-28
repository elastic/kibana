/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { mockEcsData } from '../../mock/mock_ecs';
import { createStore } from '../../store';

import { EventFieldsBrowser } from './event_fields_browser';

describe('EventFieldsBrowser', () => {
  describe('column headers', () => {
    ['Field', 'Value', 'Description'].forEach(header => {
      test(`it renders the ${header} column header`, () => {
        const store = createStore();
        const wrapper = mountWithIntl(
          <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
            <ReduxStoreProvider store={store}>
              <DragDropContext onDragEnd={noop}>
                <EventFieldsBrowser data={mockEcsData[0]} />
              </DragDropContext>
            </ReduxStoreProvider>
          </ThemeProvider>
        );

        expect(wrapper.find('thead').containsMatchingElement(<span>{header}</span>)).toBeTruthy();
      });
    });
  });

  describe('filter input', () => {
    test('it renders a filter input with the expected placeholder', () => {
      const store = createStore();
      const wrapper = mountWithIntl(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <EventFieldsBrowser data={mockEcsData[0]} />
            </DragDropContext>
          </ReduxStoreProvider>
        </ThemeProvider>
      );

      expect(wrapper.find('input[type="search"]').props().placeholder).toEqual(
        'Filter by Field, Value, or Description...'
      );
    });
  });

  describe('field type icon', () => {
    test('it renders the expected icon type for the data provided', () => {
      const store = createStore();
      const wrapper = mountWithIntl(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <EventFieldsBrowser data={mockEcsData[0]} />
            </DragDropContext>
          </ReduxStoreProvider>
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .find('.euiTableRowCell')
          .at(0)
          .find('svg')
          .exists()
      ).toEqual(true);
    });
  });

  describe('field', () => {
    test('it renders the field name for the data provided', () => {
      const store = createStore();
      const wrapper = mountWithIntl(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <EventFieldsBrowser data={mockEcsData[0]} />
            </DragDropContext>
          </ReduxStoreProvider>
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .find('.euiTableRowCell')
          .at(1)
          .containsMatchingElement(<span>@timestamp</span>)
      ).toEqual(true);
    });
  });

  describe('value', () => {
    test('it renders the expected value for the data provided', () => {
      const store = createStore();
      const wrapper = mountWithIntl(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <EventFieldsBrowser data={mockEcsData[0]} />
            </DragDropContext>
          </ReduxStoreProvider>
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .find('.euiTableRowCell')
          .at(2)
          .text()
      ).toEqual('2018-11-05T19:03:25.937Z');
    });
  });

  describe('description', () => {
    test('it renders the expected field description the data provided', () => {
      const store = createStore();
      const wrapper = mountWithIntl(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <EventFieldsBrowser data={mockEcsData[0]} />
            </DragDropContext>
          </ReduxStoreProvider>
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .find('.euiTableRowCell')
          .at(3)
          .text()
      ).toContain('Date/time when the event originated.');
    });
  });
});
