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

import { AddExceptionModal } from './';
import { useCurrentUser } from '../../../../common/lib/kibana';
import { getExceptionListSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_schema.mock';
import { useFetchIndexPatterns } from '../../../../detections/containers/detection_engine/rules';
import { stubIndexPattern } from 'src/plugins/data/common/index_patterns/index_pattern.stub';
import { useAddOrUpdateException } from '../use_add_exception';
import { useFetchOrCreateRuleExceptionList } from '../use_fetch_or_create_rule_exception_list';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { TimelineNonEcsData, Ecs } from '../../../../graphql/types';
import * as builder from '../builder';
import * as helpers from '../helpers';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { EntriesArray } from '../../../../../../lists/common/schemas/types';
import { ExceptionListItemSchema } from '../../../../../../lists/common';

jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../detections/containers/detection_engine/rules');
jest.mock('../use_add_exception');
jest.mock('../use_fetch_or_create_rule_exception_list');
jest.mock('../builder');

describe('When the add exception modal is opened', () => {
  const ruleName = 'test rule';
  let defaultEndpointItems: jest.SpyInstance<ReturnType<
    typeof helpers.defaultEndpointExceptionItems
  >>;
  let ExceptionBuilderComponent: jest.SpyInstance<ReturnType<
    typeof builder.ExceptionBuilderComponent
  >>;
  beforeEach(() => {
    defaultEndpointItems = jest.spyOn(helpers, 'defaultEndpointExceptionItems');
    ExceptionBuilderComponent = jest
      .spyOn(builder, 'ExceptionBuilderComponent')
      .mockReturnValue(<></>);

    (useAddOrUpdateException as jest.Mock).mockImplementation(() => [
      { isLoading: false },
      jest.fn(),
    ]);
    (useFetchOrCreateRuleExceptionList as jest.Mock).mockImplementation(() => [
      false,
      getExceptionListSchemaMock(),
    ]);
    (useSignalIndex as jest.Mock).mockImplementation(() => ({
      loading: false,
      signalIndexName: 'mock-siem-signals-index',
    }));
    (useFetchIndexPatterns as jest.Mock).mockImplementation(() => [
      {
        isLoading: false,
        indexPatterns: stubIndexPattern,
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
      // Mocks one of the hooks as loading
      (useFetchIndexPatterns as jest.Mock).mockImplementation(() => [
        {
          isLoading: true,
          indexPatterns: stubIndexPattern,
        },
      ]);
      wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <AddExceptionModal
            ruleId={'123'}
            ruleIndices={[]}
            ruleName={ruleName}
            exceptionListType={'endpoint'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </ThemeProvider>
      );
    });
    it('should show the loading spinner', () => {
      expect(wrapper.find('[data-test-subj="loadingAddExceptionModal"]').exists()).toBeTruthy();
    });
  });

  describe('when there is no alert data passed to an endpoint list exception', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <AddExceptionModal
            ruleId={'123'}
            ruleIndices={['filebeat-*']}
            ruleName={ruleName}
            exceptionListType={'endpoint'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </ThemeProvider>
      );
      const callProps = ExceptionBuilderComponent.mock.calls[0][0];
      act(() => callProps.onChange({ exceptionItems: [] }));
    });
    it('has the add exception button disabled', () => {
      expect(
        wrapper.find('button[data-test-subj="add-exception-confirm-button"]').getDOMNode()
      ).toBeDisabled();
    });
    it('should render the exception builder', () => {
      expect(wrapper.find('[data-test-subj="alert-exception-builder"]').exists()).toBeTruthy();
    });
    it('should not render the close on add exception checkbox', () => {
      expect(
        wrapper.find('[data-test-subj="close-alert-on-add-add-exception-checkbox"]').exists()
      ).toBeFalsy();
    });
    it('should contain the endpoint specific documentation text', () => {
      expect(wrapper.find('[data-test-subj="add-exception-endpoint-text"]').exists()).toBeTruthy();
    });
  });

  describe('when there is alert data passed to an endpoint list exception', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      const alertDataMock: { ecsData: Ecs; nonEcsData: TimelineNonEcsData[] } = {
        ecsData: { _id: 'test-id' },
        nonEcsData: [{ field: 'file.path', value: ['test/path'] }],
      };
      wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <AddExceptionModal
            ruleId={'123'}
            ruleIndices={['filebeat-*']}
            ruleName={ruleName}
            exceptionListType={'endpoint'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
            alertData={alertDataMock}
          />
        </ThemeProvider>
      );
      const callProps = ExceptionBuilderComponent.mock.calls[0][0];
      act(() => callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] }));
    });
    it('has the add exception button enabled', () => {
      expect(
        wrapper.find('button[data-test-subj="add-exception-confirm-button"]').getDOMNode()
      ).not.toBeDisabled();
    });
    it('should render the exception builder', () => {
      expect(wrapper.find('[data-test-subj="alert-exception-builder"]').exists()).toBeTruthy();
    });
    it('should prepopulate endpoint items', () => {
      expect(defaultEndpointItems).toHaveBeenCalled();
    });
    it('should render the close on add exception checkbox', () => {
      expect(
        wrapper.find('[data-test-subj="close-alert-on-add-add-exception-checkbox"]').exists()
      ).toBeTruthy();
    });
    it('should have the bulk close checkbox disabled', () => {
      expect(
        wrapper
          .find('input[data-test-subj="bulk-close-alert-on-add-add-exception-checkbox"]')
          .getDOMNode()
      ).toBeDisabled();
    });
    it('should contain the endpoint specific documentation text', () => {
      expect(wrapper.find('[data-test-subj="add-exception-endpoint-text"]').exists()).toBeTruthy();
    });
  });

  describe('when there is alert data passed to a detection list exception', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      const alertDataMock: { ecsData: Ecs; nonEcsData: TimelineNonEcsData[] } = {
        ecsData: { _id: 'test-id' },
        nonEcsData: [{ field: 'file.path', value: ['test/path'] }],
      };
      wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <AddExceptionModal
            ruleId={'123'}
            ruleIndices={['filebeat-*']}
            ruleName={ruleName}
            exceptionListType={'detection'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
            alertData={alertDataMock}
          />
        </ThemeProvider>
      );
      const callProps = ExceptionBuilderComponent.mock.calls[0][0];
      act(() => callProps.onChange({ exceptionItems: [getExceptionListItemSchemaMock()] }));
    });
    it('has the add exception button enabled', () => {
      expect(
        wrapper.find('button[data-test-subj="add-exception-confirm-button"]').getDOMNode()
      ).not.toBeDisabled();
    });
    it('should render the exception builder', () => {
      expect(wrapper.find('[data-test-subj="alert-exception-builder"]').exists()).toBeTruthy();
    });
    it('should not prepopulate endpoint items', () => {
      expect(defaultEndpointItems).not.toHaveBeenCalled();
    });
    it('should render the close on add exception checkbox', () => {
      expect(
        wrapper.find('[data-test-subj="close-alert-on-add-add-exception-checkbox"]').exists()
      ).toBeTruthy();
    });
    it('should have the bulk close checkbox disabled', () => {
      expect(
        wrapper
          .find('input[data-test-subj="bulk-close-alert-on-add-add-exception-checkbox"]')
          .getDOMNode()
      ).toBeDisabled();
    });
  });

  describe('when there is bulk-closeable alert data passed to an endpoint list exception', () => {
    let wrapper: ReactWrapper;
    let callProps: {
      onChange: (props: { exceptionItems: ExceptionListItemSchema[] }) => void;
      exceptionListItems: ExceptionListItemSchema[];
    };
    beforeEach(() => {
      // Mocks the index patterns to contain the pre-populated endpoint fields so that the exception qualifies as bulk closable
      (useFetchIndexPatterns as jest.Mock).mockImplementation(() => [
        {
          isLoading: false,
          indexPatterns: {
            ...stubIndexPattern,
            fields: [
              { name: 'file.path.text', type: 'string' },
              { name: 'subject_name', type: 'string' },
              { name: 'trusted', type: 'string' },
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
      wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <AddExceptionModal
            ruleId={'123'}
            ruleIndices={['filebeat-*']}
            ruleName={ruleName}
            exceptionListType={'endpoint'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
            alertData={alertDataMock}
          />
        </ThemeProvider>
      );
      callProps = ExceptionBuilderComponent.mock.calls[0][0];
      act(() => callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] }));
    });
    it('has the add exception button enabled', () => {
      expect(
        wrapper.find('button[data-test-subj="add-exception-confirm-button"]').getDOMNode()
      ).not.toBeDisabled();
    });
    it('should render the exception builder', () => {
      expect(wrapper.find('[data-test-subj="alert-exception-builder"]').exists()).toBeTruthy();
    });
    it('should prepopulate endpoint items', () => {
      expect(defaultEndpointItems).toHaveBeenCalled();
    });
    it('should render the close on add exception checkbox', () => {
      expect(
        wrapper.find('[data-test-subj="close-alert-on-add-add-exception-checkbox"]').exists()
      ).toBeTruthy();
    });
    it('should contain the endpoint specific documentation text', () => {
      expect(wrapper.find('[data-test-subj="add-exception-endpoint-text"]').exists()).toBeTruthy();
    });
    it('should have the bulk close checkbox enabled', () => {
      expect(
        wrapper
          .find('input[data-test-subj="bulk-close-alert-on-add-add-exception-checkbox"]')
          .getDOMNode()
      ).not.toBeDisabled();
    });
    describe('when a "is in list" entry is added', () => {
      it('should have the bulk close checkbox disabled', () => {
        act(() =>
          callProps.onChange({
            exceptionItems: [
              ...callProps.exceptionListItems,
              {
                ...getExceptionListItemSchemaMock(),
                entries: [
                  { field: 'event.code', operator: 'included', type: 'list' },
                ] as EntriesArray,
              },
            ],
          })
        );

        expect(
          wrapper
            .find('input[data-test-subj="bulk-close-alert-on-add-add-exception-checkbox"]')
            .getDOMNode()
        ).toBeDisabled();
      });
    });
  });
});
