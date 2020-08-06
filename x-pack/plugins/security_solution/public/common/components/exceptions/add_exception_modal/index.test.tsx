/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { AddExceptionModal } from './';
import { useKibana, useCurrentUser } from '../../../../common/lib/kibana';
import { getExceptionListSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_schema.mock';
import { useFetchIndexPatterns } from '../../../../detections/containers/detection_engine/rules';
import { stubIndexPattern } from 'src/plugins/data/common/index_patterns/index_pattern.stub';
import { useAddOrUpdateException } from '../use_add_exception';
import { useFetchOrCreateRuleExceptionList } from '../use_fetch_or_create_rule_exception_list';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { createUseKibanaMock } from '../../../mock/kibana_react';
import { TimelineNonEcsData, Ecs } from '../../../../graphql/types';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../detections/containers/detection_engine/rules');
jest.mock('../use_add_exception');
jest.mock('../use_fetch_or_create_rule_exception_list');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index');

const useKibanaMock = useKibana as jest.Mock;

describe('When the add exception modal is opened', () => {
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
    (useFetchOrCreateRuleExceptionList as jest.Mock).mockImplementation(() => [
      false,
      getExceptionListSchemaMock(),
    ]);
    (useSignalIndex as jest.Mock).mockReturnValue({
      loading: false,
      signalIndexName: 'test-signal',
    });
    (useFetchIndexPatterns as jest.Mock).mockImplementation(() => [
      {
        isLoading: false,
        indexPatterns: stubIndexPattern,
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
        <AddExceptionModal
          ruleId={'123'}
          ruleIndices={[]}
          ruleName={ruleName}
          exceptionListType={'endpoint'}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="loadingAddExceptionModal"]').exists()).toBeTruthy();
  });

  it('renders properly when all hooks have loaded with no alert data', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AddExceptionModal
          ruleId={'123'}
          ruleIndices={['filebeat-*']}
          ruleName={ruleName}
          exceptionListType={'endpoint'}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      </ThemeProvider>
    );
    expect(wrapper.find('[data-test-subj="alert-exception-builder"]').exists()).toBeTruthy();
    expect(
      wrapper.find('button[data-test-subj="add-exception-confirm-button"]').getDOMNode()
    ).toBeDisabled();
    expect(
      wrapper.find('[data-test-subj="close-alert-on-add-add-exception-checkbox"]').exists()
    ).toBeFalsy();
  });

  it('renders properly when all hooks have loaded with alert data', () => {
    const alertDataMock: { ecsData: Ecs; nonEcsData: TimelineNonEcsData[] } = {
      ecsData: { _id: 'test-id' },
      nonEcsData: [{ field: 'file.path', value: ['test/path'] }],
    };
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AddExceptionModal
          ruleId={'123'}
          ruleIndices={['filebeat-*']}
          ruleName={ruleName}
          exceptionListType={'endpoint'}
          onCancel={() => {}}
          onConfirm={() => {}}
          alertData={alertDataMock}
        />
      </ThemeProvider>
    );
    expect(wrapper.find('[data-test-subj="alert-exception-builder"]').exists()).toBeTruthy();
    expect(
      wrapper.find('button[data-test-subj="add-exception-confirm-button"]').getDOMNode()
    ).not.toBeDisabled();
    expect(
      wrapper.find('[data-test-subj="close-alert-on-add-add-exception-checkbox"]').exists()
    ).toBeTruthy();
    expect(
      wrapper
        .find('input[data-test-subj="bulk-close-alert-on-add-add-exception-checkbox"]')
        .getDOMNode()
    ).toBeDisabled();
  });

  it('renders properly bulk-closeable alert data', () => {
    (useFetchIndexPatterns as jest.Mock).mockImplementation(() => [
      {
        isLoading: false,
        indexPatterns: {
          ...stubIndexPattern,
          fields: [
            { name: 'file.path.text', type: 'string' },
            { name: 'file.Ext.code_signature.subject_name', type: 'string' },
            { name: 'file.Ext.code_signature.trusted', type: 'string' },
            { name: 'file.hash.sha256', type: 'string' },
            { name: 'event.code', type: 'string' },
          ],
        },
      },
    ]);
    const alertDataMock: { ecsData: Ecs; nonEcsData: TimelineNonEcsData[] } = {
      ecsData: { _id: 'test-id' },
      nonEcsData: [{ field: 'file.path', value: ['test/path'] }],
    };
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <AddExceptionModal
          ruleId={'123'}
          ruleIndices={['filebeat-*']}
          ruleName={ruleName}
          exceptionListType={'endpoint'}
          onCancel={() => {}}
          onConfirm={() => {}}
          alertData={alertDataMock}
        />
      </ThemeProvider>
    );
    expect(wrapper.find('[data-test-subj="alert-exception-builder"]').exists()).toBeTruthy();
    expect(
      wrapper.find('button[data-test-subj="add-exception-confirm-button"]').getDOMNode()
    ).not.toBeDisabled();
    expect(
      wrapper.find('[data-test-subj="close-alert-on-add-add-exception-checkbox"]').exists()
    ).toBeTruthy();
    expect(
      wrapper
        .find('input[data-test-subj="bulk-close-alert-on-add-add-exception-checkbox"]')
        .getDOMNode()
    ).not.toBeDisabled();
  });
});
