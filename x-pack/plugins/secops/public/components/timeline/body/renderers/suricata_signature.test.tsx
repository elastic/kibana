/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import toJson from 'enzyme-to-json';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { mockGlobalState } from '../../../../mock';
import { createStore, State } from '../../../../store';

import { DraggableSignatureId, SuricataSignature, Tokens } from './suricata_signature';

describe('SuricataSignature', () => {
  const state: State = mockGlobalState;
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default SuricataSignature', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <Provider store={store}>
            <DragDropContext onDragEnd={noop}>
              <SuricataSignature
                id="doc-id-123"
                signatureId="id-123"
                signature="ET SCAN ATTACK Hello"
              />
            </DragDropContext>
          </Provider>
        </ThemeProvider>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('Tokens', () => {
    test('should render empty if tokens are empty', () => {
      const wrapper = mountWithIntl(<Tokens tokens={[]} />);
      expect(wrapper.text()).toEqual(null);
    });

    test('should render a single if it is present', () => {
      const wrapper = mountWithIntl(
        <div>
          <Tokens tokens={['ET']} />
        </div>
      );
      expect(wrapper.text()).toEqual('ET');
    });

    test('should render the multiple tokens if they are present', () => {
      const wrapper = mountWithIntl(
        <div>
          <Tokens tokens={['ET', 'SCAN']} />
        </div>
      );
      expect(wrapper.text()).toEqual('ETSCAN');
    });
  });

  describe('DraggableSignatureId', () => {
    test('it renders the default SuricataSignature', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <Provider store={store}>
            <DragDropContext onDragEnd={noop}>
              <DraggableSignatureId id="id-123" signatureId="signature-123" />
            </DragDropContext>
          </Provider>
        </ThemeProvider>
      );
      expect(wrapper.text()).toEqual('signature-123');
    });
  });
});
