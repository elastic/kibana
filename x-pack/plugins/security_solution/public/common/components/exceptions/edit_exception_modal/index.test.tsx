/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount, ReactWrapper } from 'enzyme';
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
import { ExceptionBuilderComponent } from '../builder';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../detections/containers/detection_engine/rules');
jest.mock('../use_add_exception');
jest.mock('../use_fetch_or_create_rule_exception_list');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('../builder');

const useKibanaMock = useKibana as jest.Mock;

describe('When the edit exception modal is opened', () => {
  const ruleName = 'test rule';

  beforeEach(() => {
    const kibanaMock = createUseKibanaMock()();
    useKibanaMock.mockImplementation(() => ({
      ...kibanaMock,
    }));
    (useSignalIndex as jest.Mock).mockReturnValue({
      loading: false,
      signalIndexName: 'test-signal',
    });
    (useAddOrUpdateException as jest.Mock).mockImplementation(() => [
      { isLoading: false },
      () => {},
    ]);
    (useFetchIndexPatterns as jest.Mock).mockImplementation(() => [
      {
        isLoading: false,
        indexPatterns: stubIndexPatternWithFields,
      },
    ]);
    (useCurrentUser as jest.Mock).mockReturnValue({ username: 'test-username' });
    // Unsafe casting for mocking of internal component
    ((ExceptionBuilderComponent as unknown) as jest.Mock).mockReturnValue(null);
  });

  describe('when the modal is loading', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      (useFetchIndexPatterns as jest.Mock).mockImplementation(() => [
        {
          isLoading: true,
          indexPatterns: stubIndexPattern,
        },
      ]);
      wrapper = mount(
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
    });
    it('renders the loading spinner', () => {
      expect(wrapper.find('[data-test-subj="loadingEditExceptionModal"]').exists()).toBeTruthy();
    });
  });

  describe('when an endpoint exception with exception data is passed', () => {
    describe('with data that matches index patterns', () => {
      let wrapper: ReactWrapper;
      beforeEach(() => {
        const exceptionItemMock = {
          ...getExceptionListItemSchemaMock(),
          entries: [
            { field: 'response', operator: 'included', type: 'match', value: '3' },
          ] as EntriesArray,
        };
        wrapper = mount(
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
      });
      it('renders the exceptions builder', () => {
        expect(
          wrapper.find('[data-test-subj="edit-exception-modal-builder"]').exists()
        ).toBeTruthy();
      });
      it('should contain the endpoint specific documentation text', () => {
        expect(
          wrapper.find('[data-test-subj="edit-exception-endpoint-text"]').exists()
        ).toBeTruthy();
      });
    });

    describe('without data that matches index patterns', () => {
      let wrapper: ReactWrapper;
      beforeEach(() => {
        wrapper = mount(
          <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
            <EditExceptionModal
              ruleIndices={['filebeat-*']}
              ruleName={ruleName}
              exceptionListType={'endpoint'}
              onCancel={() => {}}
              onConfirm={() => {}}
              exceptionItem={getExceptionListItemSchemaMock()}
            />
          </ThemeProvider>
        );
      });
      it('renders the exceptions builder', () => {
        expect(
          wrapper.find('[data-test-subj="edit-exception-modal-builder"]').exists()
        ).toBeTruthy();
      });
      it('should contain the endpoint specific documentation text', () => {
        expect(
          wrapper.find('[data-test-subj="edit-exception-endpoint-text"]').exists()
        ).toBeTruthy();
      });
    });
  });

  describe('when an detection exception with exception data is passed', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      wrapper = mount(
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
    });
    it('renders the exceptions builder', () => {
      expect(wrapper.find('[data-test-subj="edit-exception-modal-builder"]').exists()).toBeTruthy();
    });
    it('should not contain the endpoint specific documentation text', () => {
      expect(wrapper.find('[data-test-subj="edit-exception-endpoint-text"]').exists()).toBeFalsy();
    });
  });
});
