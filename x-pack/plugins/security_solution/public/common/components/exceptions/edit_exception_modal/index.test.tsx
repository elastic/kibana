/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { EditExceptionModal } from './';
import { useKibana, useCurrentUser } from '../../../../common/lib/kibana';
import { useFetchIndexPatterns } from '../../../../detections/containers/detection_engine/rules';
import {
  stubIndexPattern,
  stubIndexPatternWithFields,
} from 'src/plugins/data/common/index_patterns/index_pattern.stub';
import { useAddOrUpdateException } from '../use_add_exception';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { createUseKibanaMock } from '../../../mock/kibana_react';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { EntriesArray } from '../../../../../../lists/common/schemas/types';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../detections/containers/detection_engine/rules');
jest.mock('../use_add_exception');
jest.mock('../use_fetch_or_create_rule_exception_list');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index');

const useKibanaMock = useKibana as jest.Mock;

describe('When the edit exception modal is opened', () => {
  const ruleName = 'test rule';

  beforeEach(() => {
    const kibanaMock = createUseKibanaMock()();
    useKibanaMock.mockImplementation(() => ({
      ...kibanaMock,
    }));
    (useAddOrUpdateException as jest.Mock).mockImplementation(() => [
      { isLoading: false },
      () => {},
    ]);
    (useSignalIndex as jest.Mock).mockReturnValue({
      loading: false,
      signalIndexName: 'test-signal',
    });
    (useFetchIndexPatterns as jest.Mock).mockImplementation(() => [
      {
        isLoading: false,
        indexPatterns: stubIndexPatternWithFields,
      },
    ]);
    (useCurrentUser as jest.Mock).mockReturnValue({ username: 'test-username' });
  });

  it('renders the loading spinner when some of the hooks are loading', () => {
    (useFetchIndexPatterns as jest.Mock).mockImplementation(() => [
      {
        isLoading: true,
        indexPatterns: stubIndexPattern,
      },
    ]);
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <EditExceptionModal
          ruleIndices={[]}
          ruleName={ruleName}
          exceptionListType={'endpoint'}
          onCancel={() => {}}
          onConfirm={() => {}}
          exceptionItem={getExceptionListItemSchemaMock()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="loadingEditExceptionModal"]').exists()).toBeTruthy();
  });

  it('renders endpoint type properly when all hooks have loaded with exception data', () => {
    const exceptionItemMock = {
      ...getExceptionListItemSchemaMock(),
      entries: [
        { field: 'response', operator: 'included', type: 'match', value: '3' },
      ] as EntriesArray,
    };
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <EditExceptionModal
          ruleIndices={['filebeat-*']}
          ruleName={ruleName}
          exceptionListType={'endpoint'}
          onCancel={() => {}}
          onConfirm={() => {}}
          exceptionItem={exceptionItemMock}
        />
      </ThemeProvider>
    );
    expect(wrapper.find('[data-test-subj="edit-exception-modal-builder"]').exists()).toBeTruthy();
    expect(
      wrapper.find('button[data-test-subj="edit-exception-confirm-button"]').getDOMNode()
    ).not.toBeDisabled();
    expect(wrapper.find('[data-test-subj="edit-exception-endpoint-text"]').exists()).toBeTruthy();
    expect(
      wrapper
        .find('input[data-test-subj="close-alert-on-add-edit-exception-checkbox"]')
        .getDOMNode()
    ).not.toBeDisabled();
  });

  it('renders detection type properly when all hooks have loaded with exception data', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <EditExceptionModal
          ruleIndices={['filebeat-*']}
          ruleName={ruleName}
          exceptionListType={'detection'}
          onCancel={() => {}}
          onConfirm={() => {}}
          exceptionItem={getExceptionListItemSchemaMock()}
        />
      </ThemeProvider>
    );
    expect(wrapper.find('[data-test-subj="edit-exception-modal-builder"]').exists()).toBeTruthy();
    expect(
      wrapper.find('button[data-test-subj="edit-exception-confirm-button"]').getDOMNode()
    ).not.toBeDisabled();
    expect(wrapper.find('[data-test-subj="edit-exception-endpoint-text"]').exists()).toBeFalsy();
  });

  it('renders properly when all hooks have loaded with no exception data', () => {
    const exceptionItemMock = { ...getExceptionListItemSchemaMock(), entries: [] };
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <EditExceptionModal
          ruleIndices={['filebeat-*']}
          ruleName={ruleName}
          exceptionListType={'detection'}
          onCancel={() => {}}
          onConfirm={() => {}}
          exceptionItem={exceptionItemMock}
        />
      </ThemeProvider>
    );
    expect(wrapper.find('[data-test-subj="edit-exception-modal-builder"]').exists()).toBeTruthy();
    expect(
      wrapper.find('button[data-test-subj="edit-exception-confirm-button"]').getDOMNode()
    ).toBeDisabled();
  });
});
