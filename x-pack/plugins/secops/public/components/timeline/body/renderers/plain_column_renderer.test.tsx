/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import { cloneDeep, noop, omit } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { plainColumnRenderer } from '.';
import { Ecs } from '../../../../graphql/types';
import { getAllFieldsInSchemaByMappedName, virtualEcsSchema } from '../../../../lib/ecs';
import { mockEcsData } from '../../../../mock';
import { createStore } from '../../../../store';
import { getEmptyValue } from '../../../empty_value';

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
    const missingSource = omit('source', mockDatum);
    expect(plainColumnRenderer.isInstance('source', missingSource)).toBe(false);
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
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{column}</span>
          </DragDropContext>
        </ReduxStoreProvider>
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
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{column}</span>
          </DragDropContext>
        </ReduxStoreProvider>
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
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{column}</span>
          </DragDropContext>
        </ReduxStoreProvider>
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
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{column}</span>
          </DragDropContext>
        </ReduxStoreProvider>
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
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{column}</span>
          </DragDropContext>
        </ReduxStoreProvider>
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
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{column}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('192.168.0.1');
  });

  test('should return the (unformatted) time if timestamp has a valid value', () => {
    const column = plainColumnRenderer.renderColumn(
      'timestamp',
      mockDatum,
      allFieldsInSchemaByName.timestamp
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{column}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(mockDatum.timestamp!);
  });

  test('should return the value of event.type if event.type has a valid value', () => {
    const column = plainColumnRenderer.renderColumn(
      'event.type',
      mockDatum,
      allFieldsInSchemaByName['event.type']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{column}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('HTTP Request');
  });

  test('should return the of user.name if user.name has a valid value', () => {
    const column = plainColumnRenderer.renderColumn(
      'user.name',
      mockDatum,
      allFieldsInSchemaByName['user.name']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{column}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('john.dee');
  });

  test('should return an empty value if event.category is empty', () => {
    const missingCategory = omit('event.category', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn(
      'event.category',
      missingCategory,
      allFieldsInSchemaByName['event.category']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{emptyColumn}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if destination is empty', () => {
    const missingDestination = omit('destination', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn(
      'destination',
      missingDestination,
      allFieldsInSchemaByName.destination
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{emptyColumn}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if destination ip is empty', () => {
    const missingDestination = omit('destination.ip', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn(
      'destination.ip',
      missingDestination,
      allFieldsInSchemaByName['destination.ip']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{emptyColumn}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if event severity is empty', () => {
    const missingSeverity = omit('event.severity', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn(
      'event.severity',
      missingSeverity,
      allFieldsInSchemaByName['event.severity']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{emptyColumn}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if source is empty', () => {
    const missingSource = omit('source', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn(
      'source',
      missingSource,
      allFieldsInSchemaByName.source
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{emptyColumn}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if source.ip is empty', () => {
    const missingSource = omit('source.ip', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn(
      'source.ip',
      missingSource,
      allFieldsInSchemaByName['source.ip']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{emptyColumn}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if event.type is empty', () => {
    const missingType = omit('event.type', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn(
      'event.type',
      missingType,
      allFieldsInSchemaByName['event.type']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{emptyColumn}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if user.name is empty', () => {
    const missingUser = omit('user.name', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn(
      'user.name',
      missingUser,
      allFieldsInSchemaByName['user.name']
    );
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{emptyColumn}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
