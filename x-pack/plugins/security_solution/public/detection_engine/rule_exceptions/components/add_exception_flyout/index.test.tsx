/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { AddExceptionFlyout } from '.';
import { getExceptionBuilderComponentLazy } from '@kbn/lists-plugin/public';
import { useAsync } from '@kbn/securitysolution-hook-utils';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import { useFetchIndex } from '../../../../common/containers/source';
import { createStubIndexPattern, stubIndexPattern } from '@kbn/data-plugin/common/stubs';
import { useAddOrUpdateException } from '../../logic/use_add_exception';
import { useFetchOrCreateRuleExceptionList } from '../../logic/use_fetch_or_create_rule_exception_list';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import * as helpers from '../../utils/helpers';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';

import { TestProviders } from '../../../../common/mock';

import {
  getRulesEqlSchemaMock,
  getRulesSchemaMock,
} from '../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { useRule } from '../../../rule_management/logic/use_rule';
import type { AlertData } from '../../utils/types';

jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/containers/source');
jest.mock('../../../../detections/containers/detection_engine/rules');
jest.mock('../../logic/use_add_exception');
jest.mock('../../logic/use_fetch_or_create_rule_exception_list');
jest.mock('@kbn/securitysolution-hook-utils', () => ({
  ...jest.requireActual('@kbn/securitysolution-hook-utils'),
  useAsync: jest.fn(),
}));
jest.mock('../../../rule_management/logic/use_rule');
jest.mock('@kbn/lists-plugin/public');

const mockGetExceptionBuilderComponentLazy = getExceptionBuilderComponentLazy as jest.Mock<
  ReturnType<typeof getExceptionBuilderComponentLazy>
>;
const mockUseAsync = useAsync as jest.Mock<ReturnType<typeof useAsync>>;
const mockUseAddOrUpdateException = useAddOrUpdateException as jest.Mock<
  ReturnType<typeof useAddOrUpdateException>
>;
const mockUseFetchOrCreateRuleExceptionList = useFetchOrCreateRuleExceptionList as jest.Mock<
  ReturnType<typeof useFetchOrCreateRuleExceptionList>
>;
const mockUseSignalIndex = useSignalIndex as jest.Mock<Partial<ReturnType<typeof useSignalIndex>>>;
const mockUseFetchIndex = useFetchIndex as jest.Mock;
const mockUseRuleAsync = useRule as jest.Mock;

describe('When the add exception modal is opened', () => {
  const ruleName = 'test rule';
  let defaultEndpointItems: jest.SpyInstance<
    ReturnType<typeof helpers.defaultEndpointExceptionItems>
  >;
  beforeEach(() => {
    mockGetExceptionBuilderComponentLazy.mockReturnValue(
      <span data-test-subj="alert-exception-builder" />
    );
    defaultEndpointItems = jest.spyOn(helpers, 'defaultEndpointExceptionItems');

    mockUseAsync.mockImplementation(() => ({
      start: jest.fn(),
      loading: false,
      error: {},
      result: true,
    }));

    mockUseAddOrUpdateException.mockImplementation(() => [{ isLoading: false }, jest.fn()]);
    mockUseFetchOrCreateRuleExceptionList.mockImplementation(() => [
      false,
      getExceptionListSchemaMock(),
    ]);
    mockUseSignalIndex.mockImplementation(() => ({
      loading: false,
      signalIndexName: 'mock-siem-signals-index',
    }));
    mockUseFetchIndex.mockImplementation(() => [
      false,
      {
        indexPatterns: stubIndexPattern,
      },
    ]);
    mockUseRuleAsync.mockImplementation(() => ({
      data: getRulesSchemaMock(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('when the modal is loading', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      // Mocks one of the hooks as loading
      mockUseFetchIndex.mockImplementation(() => [
        true,
        {
          indexPatterns: stubIndexPattern,
        },
      ]);
      wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            ruleId={'123'}
            ruleIndices={[]}
            ruleName={ruleName}
            exceptionListType={'endpoint'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </TestProviders>
      );
    });
    it('should show the loading spinner', () => {
      expect(wrapper.find('[data-test-subj="loadingAddExceptionFlyout"]').exists()).toBeTruthy();
    });
  });

  describe('when there is no alert data passed to an endpoint list exception', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            ruleId={'123'}
            ruleIndices={['filebeat-*']}
            ruleName={ruleName}
            exceptionListType={'endpoint'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </TestProviders>
      );
      const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
      await waitFor(() => callProps.onChange({ exceptionItems: [] }));
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
    it('should render the os selection dropdown', () => {
      expect(wrapper.find('[data-test-subj="os-selection-dropdown"]').exists()).toBeTruthy();
    });
  });

  describe('when there is alert data passed to an endpoint list exception', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      const alertDataMock: AlertData = {
        '@timestamp': '1234567890',
        _id: 'test-id',
        file: { path: 'test/path' },
      };
      wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            ruleId={'123'}
            ruleIndices={['filebeat-*']}
            ruleName={ruleName}
            exceptionListType={'endpoint'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
            alertData={alertDataMock}
          />
        </TestProviders>
      );
      const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
      await waitFor(() =>
        callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] })
      );
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
    it('should not display the eql sequence callout', () => {
      expect(wrapper.find('[data-test-subj="eql-sequence-callout"]').exists()).not.toBeTruthy();
    });
    it('should not render the os selection dropdown', () => {
      expect(wrapper.find('[data-test-subj="os-selection-dropdown"]').exists()).toBeFalsy();
    });
  });

  describe('when there is alert data passed to a detection list exception', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      const alertDataMock: AlertData = {
        '@timestamp': '1234567890',
        _id: 'test-id',
        file: { path: 'test/path' },
      };
      wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            ruleId={'123'}
            ruleIndices={['filebeat-*']}
            ruleName={ruleName}
            exceptionListType={'detection'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
            alertData={alertDataMock}
          />
        </TestProviders>
      );
      const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
      await waitFor(() =>
        callProps.onChange({ exceptionItems: [getExceptionListItemSchemaMock()] })
      );
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
    it('should not display the eql sequence callout', () => {
      expect(wrapper.find('[data-test-subj="eql-sequence-callout"]').exists()).not.toBeTruthy();
    });
  });

  describe('when there is an exception being created on a sequence eql rule type', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      mockUseRuleAsync.mockImplementation(() => ({
        rule: {
          ...getRulesEqlSchemaMock(),
          query:
            'sequence [process where process.name = "test.exe"] [process where process.name = "explorer.exe"]',
        },
      }));
      const alertDataMock: AlertData = {
        '@timestamp': '1234567890',
        _id: 'test-id',
        file: { path: 'test/path' },
      };
      wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            ruleId={'123'}
            ruleIndices={['filebeat-*']}
            ruleName={ruleName}
            exceptionListType={'detection'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
            alertData={alertDataMock}
          />
        </TestProviders>
      );
      const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
      await waitFor(() =>
        callProps.onChange({ exceptionItems: [getExceptionListItemSchemaMock()] })
      );
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
    it('should display the eql sequence callout', () => {
      expect(wrapper.find('[data-test-subj="eql-sequence-callout"]').exists()).toBeTruthy();
    });
  });

  describe('when there is bulk-closeable alert data passed to an endpoint list exception', () => {
    let wrapper: ReactWrapper;

    beforeEach(async () => {
      mockUseFetchIndex.mockImplementation(() => [
        false,
        {
          indexPatterns: createStubIndexPattern({
            spec: {
              id: '1234',
              title: 'filebeat-*',
              fields: {
                'event.code': {
                  name: 'event.code',
                  type: 'string',
                  aggregatable: true,
                  searchable: true,
                },
                'file.path.caseless': {
                  name: 'file.path.caseless',
                  type: 'string',
                  aggregatable: true,
                  searchable: true,
                },
                subject_name: {
                  name: 'subject_name',
                  type: 'string',
                  aggregatable: true,
                  searchable: true,
                },
                trusted: {
                  name: 'trusted',
                  type: 'string',
                  aggregatable: true,
                  searchable: true,
                },
                'file.hash.sha256': {
                  name: 'file.hash.sha256',
                  type: 'string',
                  aggregatable: true,
                  searchable: true,
                },
              },
            },
          }),
        },
      ]);

      const alertDataMock: AlertData = {
        '@timestamp': '1234567890',
        _id: 'test-id',
        file: { path: 'test/path' },
      };
      wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            ruleId={'123'}
            ruleIndices={['filebeat-*']}
            ruleName={ruleName}
            exceptionListType={'endpoint'}
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
            alertData={alertDataMock}
            isAlertDataLoading={false}
          />
        </TestProviders>
      );

      const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
      await waitFor(() => {
        return callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] });
      });
    });
    it('has the add exception button enabled', async () => {
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
      it('should have the bulk close checkbox disabled', async () => {
        const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];

        await waitFor(() =>
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

  test('when there are exception builder errors submit button is disabled', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddExceptionFlyout
          ruleId={'123'}
          ruleIndices={['filebeat-*']}
          ruleName={ruleName}
          exceptionListType={'endpoint'}
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />
      </TestProviders>
    );
    const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
    await waitFor(() => callProps.onChange({ exceptionItems: [], errorExists: true }));
    expect(
      wrapper.find('button[data-test-subj="add-exception-confirm-button"]').getDOMNode()
    ).toBeDisabled();
  });
});
