/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import { cloneDeep, noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import moment from 'moment-timezone';
import { plainColumnRenderer } from '.';
import { Ecs } from '../../../../graphql/types';
import { getAllFieldsInSchemaByMappedName, virtualEcsSchema } from '../../../../lib/ecs';
import { mockEcsData, mockFramework } from '../../../../mock';
import { createStore } from '../../../../store';
import { getEmptyValue } from '../../../empty_value';
import { KibanaConfigContext } from '../../../formatted_date';

const allFieldsInSchemaByName = getAllFieldsInSchemaByMappedName(virtualEcsSchema);

describe('plain_column_renderer', () => {
  let mockDatum: Ecs;

  let store = createStore();

  beforeEach(() => {
    store = createStore();
  });

  beforeEach(() => {
    mockDatum = cloneDeep(mockEcsData[0]);
  });

  test('should return isInstance false if source is empty', () => {
    delete mockDatum.source;
    expect(plainColumnRenderer.isInstance('source', mockDatum)).toBe(false);
  });

  test('should return isInstance true if source is NOT empty', () => {
    expect(plainColumnRenderer.isInstance('source', mockDatum)).toBe(true);
  });

  test('should return isInstance false if it encounters a column it does not know about', () => {
    expect(plainColumnRenderer.isInstance('made up name', mockDatum)).toBe(false);
  });

  test('should return the value of event.category if event.category has a valid value', () => {
    const column = plainColumnRenderer.renderColumn(
      'event.category',
      mockDatum,
      allFieldsInSchemaByName['event.category']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{column}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('Access');
  });

  test('should return the value of destination.ip if destination.ip has a valid value', () => {
    const column = plainColumnRenderer.renderColumn(
      'destination.ip',
      mockDatum,
      allFieldsInSchemaByName['destination.ip']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{column}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('192.168.0.3');
  });

  test('should return the value of event.id if event has a valid value', () => {
    const column = plainColumnRenderer.renderColumn(
      'event.id',
      mockDatum,
      allFieldsInSchemaByName['event.id']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{column}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('1');
  });

  test('should return the value of geo.region_name if geo.region_name has a valid value', () => {
    const column = plainColumnRenderer.renderColumn(
      'geo.region_name',
      mockDatum,
      allFieldsInSchemaByName['geo.region_name']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{column}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('xx');
  });

  test('should return the value of event.severity if severity has a valid value', () => {
    const column = plainColumnRenderer.renderColumn(
      'event.severity',
      mockDatum,
      allFieldsInSchemaByName['event.severity']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{column}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('3');
  });

  test('should return the value of source.ip if source.ip has a valid value', () => {
    const column = plainColumnRenderer.renderColumn(
      'source.ip',
      mockDatum,
      allFieldsInSchemaByName['source.ip']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{column}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('192.168.0.1');
  });

  test('should return the time formatted as per Kibana advanced settings if timestamp has a valid value', () => {
    const column = plainColumnRenderer.renderColumn(
      'timestamp',
      mockDatum,
      allFieldsInSchemaByName.timestamp
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{column}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(
      moment.tz(mockDatum.timestamp!, mockFramework.dateFormatTz!).format(mockFramework.dateFormat)
    );
  });

  test('should return the value of event.action if event.action has a valid value', () => {
    const column = plainColumnRenderer.renderColumn(
      'event.action',
      mockDatum,
      allFieldsInSchemaByName['event.action']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{column}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('Action');
  });

  test('should return the of user.name if user.name has a valid value', () => {
    const column = plainColumnRenderer.renderColumn(
      'user.name',
      mockDatum,
      allFieldsInSchemaByName['user.name']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{column}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('john.dee');
  });

  test('should return an empty value if event.category is empty', () => {
    delete mockDatum!.event!.category;
    const emptyColumn = plainColumnRenderer.renderColumn(
      'event.category',
      mockDatum,
      allFieldsInSchemaByName['event.category']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{emptyColumn}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if destination is empty', () => {
    delete mockDatum.destination;
    const emptyColumn = plainColumnRenderer.renderColumn(
      'destination',
      mockDatum,
      allFieldsInSchemaByName.destination
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{emptyColumn}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if destination ip is empty', () => {
    delete mockDatum.destination!.ip;
    const emptyColumn = plainColumnRenderer.renderColumn(
      'destination.ip',
      mockDatum,
      allFieldsInSchemaByName['destination.ip']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{emptyColumn}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if event severity is empty', () => {
    delete mockDatum.event!.severity;
    const emptyColumn = plainColumnRenderer.renderColumn(
      'event.severity',
      mockDatum,
      allFieldsInSchemaByName['event.severity']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{emptyColumn}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if source is empty', () => {
    delete mockDatum.source;
    const emptyColumn = plainColumnRenderer.renderColumn(
      'source',
      mockDatum,
      allFieldsInSchemaByName.source
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{emptyColumn}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if source.ip is empty', () => {
    delete mockDatum.source!.ip;
    const emptyColumn = plainColumnRenderer.renderColumn(
      'source.ip',
      mockDatum,
      allFieldsInSchemaByName['source.ip']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{emptyColumn}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if event.action is empty', () => {
    delete mockDatum.event!.action;
    const emptyColumn = plainColumnRenderer.renderColumn(
      'event.action',
      mockDatum,
      allFieldsInSchemaByName['event.action']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{emptyColumn}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if user.name is empty', () => {
    delete mockDatum.user!.name;
    const emptyColumn = plainColumnRenderer.renderColumn(
      'user.name',
      mockDatum,
      allFieldsInSchemaByName['user.name']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <KibanaConfigContext.Provider value={mockFramework}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <span>{emptyColumn}</span>
            </DragDropContext>
          </ReduxStoreProvider>
        </KibanaConfigContext.Provider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
