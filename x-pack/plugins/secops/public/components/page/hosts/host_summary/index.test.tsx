/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { mockGlobalState } from '../../../../mock';
import { createStore, State } from '../../../../store';
import { DragDropContextWrapper } from '../../../drag_and_drop/drag_drop_context_wrapper';
import { getEmptyString } from '../../../empty_string';
import { getEmptyValue } from '../../../empty_value';
import { createDraggable, getEuiDescriptionList, HostSummary } from './index';
import { mockData } from './mock';

describe('Host Summary Component', () => {
  const state: State = mockGlobalState;
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default Host Summary', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <HostSummary
            loading={false}
            data={mockData.Hosts.edges}
            startDate={552204000000}
            endDate={618472800000}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('#createDraggable', () => {
    test('if it creates a draggable component', () => {
      const draggable = createDraggable(
        'debian',
        'Platform',
        552204000000,
        618472800000,
        mockData.DateFields
      );
      const wrapper = mountWithIntl(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme}>
            <DragDropContextWrapper>{draggable}</DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );
      expect(wrapper.text()).toBe('debian');
    });

    test('if it returns a FormattedRelative element', () => {
      const draggable = createDraggable(
        '2019-01-28T22:14:16.039Z',
        'lastBeat',
        552204000000,
        618472800000,
        ['lastBeat']
      );
      const wrapper = mountWithIntl(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme}>
            <DragDropContextWrapper>{draggable}</DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );
      expect(wrapper.find('FormattedRelative')).toHaveLength(1);
    });

    test('if it returns an empty value', () => {
      const draggable = createDraggable(
        null,
        'Platform',
        552204000000,
        618472800000,
        mockData.DateFields
      );
      const wrapper = mountWithIntl(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme}>
            <DragDropContextWrapper>{draggable}</DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );
      expect(wrapper.text()).toBe(getEmptyValue());
    });

    test('if it returns a string placeholder with an empty string', () => {
      const draggable = createDraggable(
        '',
        'Platform',
        552204000000,
        618472800000,
        mockData.DateFields
      );
      const wrapper = mountWithIntl(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme}>
            <DragDropContextWrapper>{draggable}</DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );
      expect(wrapper.text()).toBe(getEmptyString());
    });

    test('if works with a string with a single space as a valid value and NOT an empty value', () => {
      const draggable = createDraggable(
        ' ',
        'Platform',
        552204000000,
        618472800000,
        mockData.DateFields
      );
      const wrapper = mountWithIntl(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme}>
            <DragDropContextWrapper>{draggable}</DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );
      expect(wrapper.text()).toBe(' ');
    });
  });

  describe('#getEuiDescriptionList', () => {
    test('if it creates a description list', () => {
      const euiDescriptionList = getEuiDescriptionList(
        mockData.Hosts.edges[0].node,
        552204000000,
        618472800000
      );
      const wrapper = mountWithIntl(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme}>
            <DragDropContextWrapper>{euiDescriptionList}</DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );
      expect(wrapper.text()).toBe(
        'Namesiem-kibanaLast Beat--Idaa7ca589f1b8220002f2fc61c64cfbf1IP Address10.142.0.7fe80::4001:aff:fe8e:7MAC Addr42:01:0a:8e:00:07Typeprojects/189716325846/machineTypes/n1-standard-1PlatformdebianOS NameDebian GNU/LinuxFamilydebianVersion9 (stretch)Architecturex86_64'
      );
    });

    test('if it creates an empty description list', () => {
      const euiDescriptionList = getEuiDescriptionList(null, 552204000000, 618472800000);
      const wrapper = mountWithIntl(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme}>
            <DragDropContextWrapper>{euiDescriptionList}</DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );
      expect(wrapper.text()).toBe(
        'Name--Last Beat--Id--IP Address--MAC Addr--Type--Platform--OS Name--Family--Version--Architecture--'
      );
    });
  });
});
