/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount, ReactWrapper } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { act } from 'react-dom/test-utils';

import { EditExceptionModal } from './';
import { useCurrentUser } from '../../../../common/lib/kibana';
import { useFetchIndexPatterns } from '../../../../detections/containers/detection_engine/rules';
import {
  stubIndexPattern,
  stubIndexPatternWithFields,
} from 'src/plugins/data/common/index_patterns/index_pattern.stub';
import { useAddOrUpdateException } from '../use_add_exception';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { EntriesArray } from '../../../../../../lists/common/schemas/types';
import * as builder from '../builder';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../detections/containers/detection_engine/rules');
jest.mock('../use_add_exception');
jest.mock('../use_fetch_or_create_rule_exception_list');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('../builder');

describe('When the edit exception modal is opened', () => {
  const ruleName = 'test rule';

  let ExceptionBuilderComponent: jest.SpyInstance<ReturnType<
    typeof builder.ExceptionBuilderComponent
  >>;

  beforeEach(() => {
    ExceptionBuilderComponent = jest
      .spyOn(builder, 'ExceptionBuilderComponent')
      .mockReturnValue(<></>);

    (useSignalIndex as jest.Mock).mockReturnValue({
      loading: false,
      signalIndexName: 'test-signal',
    });
    (useAddOrUpdateException as jest.Mock).mockImplementation(() => [
      { isLoading: false },
      jest.fn(),
    ]);
    (useFetchIndexPatterns as jest.Mock).mockImplementation(() => [
      {
        isLoading: false,
        indexPatterns: stubIndexPatternWithFields,
      },
    ]);
    (useCurrentUser as jest.Mock).mockReturnValue({ username: 'test-username' });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
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
            ruleId="123"
            ruleName={ruleName}
            exceptionListType={'endpoint'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
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
    describe('when exception entry fields are included in the index pattern', () => {
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
              ruleId="123"
              ruleName={ruleName}
              exceptionListType={'endpoint'}
              onCancel={jest.fn()}
              onConfirm={jest.fn()}
              exceptionItem={exceptionItemMock}
            />
          </ThemeProvider>
        );
        const callProps = ExceptionBuilderComponent.mock.calls[0][0];
        act(() => callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] }));
      });
      it('has the edit exception button enabled', () => {
        expect(
          wrapper.find('button[data-test-subj="edit-exception-confirm-button"]').getDOMNode()
        ).not.toBeDisabled();
      });
      it('should have the bulk close checkbox enabled', () => {
        expect(
          wrapper
            .find('input[data-test-subj="close-alert-on-add-edit-exception-checkbox"]')
            .getDOMNode()
        ).not.toBeDisabled();
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

    describe("when exception entry fields aren't included in the index pattern", () => {
      let wrapper: ReactWrapper;
      beforeEach(() => {
        wrapper = mount(
          <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
            <EditExceptionModal
              ruleIndices={['filebeat-*']}
              ruleId="123"
              ruleName={ruleName}
              exceptionListType={'endpoint'}
              onCancel={jest.fn()}
              onConfirm={jest.fn()}
              exceptionItem={getExceptionListItemSchemaMock()}
            />
          </ThemeProvider>
        );
        const callProps = ExceptionBuilderComponent.mock.calls[0][0];
        act(() => callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] }));
      });
      it('has the edit exception button enabled', () => {
        expect(
          wrapper.find('button[data-test-subj="edit-exception-confirm-button"]').getDOMNode()
        ).not.toBeDisabled();
      });
      it('should have the bulk close checkbox disabled', () => {
        expect(
          wrapper
            .find('input[data-test-subj="close-alert-on-add-edit-exception-checkbox"]')
            .getDOMNode()
        ).toBeDisabled();
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

  describe('when an detection exception with entries is passed', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <EditExceptionModal
            ruleIndices={['filebeat-*']}
            ruleId="123"
            ruleName={ruleName}
            exceptionListType={'detection'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
            exceptionItem={getExceptionListItemSchemaMock()}
          />
        </ThemeProvider>
      );
      const callProps = ExceptionBuilderComponent.mock.calls[0][0];
      act(() => callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] }));
    });
    it('has the edit exception button enabled', () => {
      expect(
        wrapper.find('button[data-test-subj="edit-exception-confirm-button"]').getDOMNode()
      ).not.toBeDisabled();
    });
    it('renders the exceptions builder', () => {
      expect(wrapper.find('[data-test-subj="edit-exception-modal-builder"]').exists()).toBeTruthy();
    });
    it('should not contain the endpoint specific documentation text', () => {
      expect(wrapper.find('[data-test-subj="edit-exception-endpoint-text"]').exists()).toBeFalsy();
    });
    it('should have the bulk close checkbox disabled', () => {
      expect(
        wrapper
          .find('input[data-test-subj="close-alert-on-add-edit-exception-checkbox"]')
          .getDOMNode()
      ).toBeDisabled();
    });
  });

  describe('when an exception with no entries is passed', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      const exceptionItemMock = { ...getExceptionListItemSchemaMock(), entries: [] };
      wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <EditExceptionModal
            ruleIndices={['filebeat-*']}
            ruleId="123"
            ruleName={ruleName}
            exceptionListType={'detection'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
            exceptionItem={exceptionItemMock}
          />
        </ThemeProvider>
      );
      const callProps = ExceptionBuilderComponent.mock.calls[0][0];
      act(() => callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] }));
    });
    it('has the edit exception button disabled', () => {
      expect(
        wrapper.find('button[data-test-subj="edit-exception-confirm-button"]').getDOMNode()
      ).toBeDisabled();
    });
    it('renders the exceptions builder', () => {
      expect(wrapper.find('[data-test-subj="edit-exception-modal-builder"]').exists()).toBeTruthy();
    });
    it('should have the bulk close checkbox disabled', () => {
      expect(
        wrapper
          .find('input[data-test-subj="close-alert-on-add-edit-exception-checkbox"]')
          .getDOMNode()
      ).toBeDisabled();
    });
  });
});
