/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactWrapper } from 'enzyme';
import { mount, shallow } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import { getExceptionBuilderComponentLazy } from '@kbn/lists-plugin/public';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { createStubIndexPattern, stubIndexPattern } from '@kbn/data-plugin/common/stubs';

import { AddExceptionFlyout } from '.';
import { useFetchIndex } from '../../../../common/containers/source';
import { useCreateOrUpdateException } from '../../logic/use_create_update_exception';
import { useFetchIndexPatterns } from '../../logic/use_exception_flyout_data';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import * as helpers from '../../utils/helpers';
import type { Rule } from '../../../rule_management/logic/types';
import * as i18n from './translations';

import { TestProviders } from '../../../../common/mock';

import {
  getRulesEqlSchemaMock,
  getRulesSchemaMock,
} from '../../../../../common/detection_engine/rule_schema/mocks';
import type { AlertData } from '../../utils/types';
import { useFindRules } from '../../../rule_management/logic/use_find_rules';
import { useFindExceptionListReferences } from '../../logic/use_find_references';

jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/containers/source');
jest.mock('../../logic/use_create_update_exception');
jest.mock('../../logic/use_exception_flyout_data');
jest.mock('../../logic/use_find_references');
jest.mock('@kbn/securitysolution-hook-utils', () => ({
  ...jest.requireActual('@kbn/securitysolution-hook-utils'),
  useAsync: jest.fn(),
}));
jest.mock('../../../rule_management/logic/use_rule');
jest.mock('@kbn/lists-plugin/public');
jest.mock('../../../rule_management/logic/use_find_rules');
jest.mock('../../../rule_management/api/hooks/use_fetch_rule_by_id_query');

const mockGetExceptionBuilderComponentLazy = getExceptionBuilderComponentLazy as jest.Mock<
  ReturnType<typeof getExceptionBuilderComponentLazy>
>;
const mockUseAddOrUpdateException = useCreateOrUpdateException as jest.Mock<
  ReturnType<typeof useCreateOrUpdateException>
>;
const mockFetchIndexPatterns = useFetchIndexPatterns as jest.Mock<
  ReturnType<typeof useFetchIndexPatterns>
>;
const mockUseSignalIndex = useSignalIndex as jest.Mock<Partial<ReturnType<typeof useSignalIndex>>>;
const mockUseFetchIndex = useFetchIndex as jest.Mock;
const mockUseFindRules = useFindRules as jest.Mock;
const mockUseFindExceptionListReferences = useFindExceptionListReferences as jest.Mock;

const alertDataMock: AlertData = {
  '@timestamp': '1234567890',
  _id: 'test-id',
  file: { path: 'test/path' },
};

describe('When the add exception modal is opened', () => {
  let defaultEndpointItems: jest.SpyInstance<
    ReturnType<typeof helpers.defaultEndpointExceptionItems>
  >;
  beforeEach(() => {
    mockGetExceptionBuilderComponentLazy.mockReturnValue(
      <span data-test-subj="alertExceptionBuilder" />
    );
    defaultEndpointItems = jest.spyOn(helpers, 'defaultEndpointExceptionItems');

    mockUseAddOrUpdateException.mockImplementation(() => [false, jest.fn()]);
    mockFetchIndexPatterns.mockImplementation(() => ({
      isLoading: false,
      indexPatterns: stubIndexPattern,
    }));

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
    mockUseFindRules.mockImplementation(() => ({
      data: {
        rules: [
          {
            ...getRulesSchemaMock(),
            exceptions_list: [],
          } as Rule,
        ],
        total: 1,
      },
      isFetched: true,
    }));
    mockUseFindExceptionListReferences.mockImplementation(() => [
      false,
      false,
      {
        my_list_id: {
          ...getExceptionListSchemaMock(),
          id: '123',
          list_id: 'my_list_id',
          namespace_type: 'single',
          type: ExceptionListTypeEnum.DETECTION,
          name: 'My exception list',
          referenced_rules: [
            {
              id: '345',
              name: 'My rule',
              rule_id: 'my_rule_id',
              exception_lists: [
                {
                  id: '123',
                  list_id: 'my_list_id',
                  namespace_type: 'single',
                  type: ExceptionListTypeEnum.DETECTION,
                },
              ],
            },
          ],
        },
      },
      jest.fn(),
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('when the modal is loading', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      // Mocks one of the hooks as loading
      mockFetchIndexPatterns.mockImplementation(() => ({
        isLoading: true,
        indexPatterns: { fields: [], title: 'foo' },
      }));

      wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            rules={[{ ...getRulesSchemaMock() } as Rule]}
            isBulkAction={false}
            alertData={undefined}
            isAlertDataLoading={undefined}
            alertStatus={undefined}
            isEndpointItem={false}
            showAlertCloseOptions
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

  describe('exception list type of "endpoint"', () => {
    describe('common functionality to test regardless of alert input', () => {
      let wrapper: ReactWrapper;
      beforeEach(async () => {
        wrapper = mount(
          <TestProviders>
            <AddExceptionFlyout
              rules={[
                {
                  ...getRulesSchemaMock(),
                  index: ['filebeat-*'],
                  exceptions_list: [
                    {
                      id: 'endpoint_list',
                      list_id: 'endpoint_list',
                      namespace_type: 'agnostic',
                      type: 'endpoint',
                    },
                  ],
                } as Rule,
              ]}
              isBulkAction={false}
              alertData={undefined}
              isAlertDataLoading={undefined}
              alertStatus={undefined}
              isEndpointItem
              showAlertCloseOptions
              onCancel={jest.fn()}
              onConfirm={jest.fn()}
            />
          </TestProviders>
        );
        const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
        await waitFor(() =>
          callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] })
        );
      });

      it('displays proper flyout and button text', () => {
        expect(wrapper.find('[data-test-subj="exceptionFlyoutTitle"]').at(1).text()).toEqual(
          i18n.ADD_ENDPOINT_EXCEPTION
        );
        expect(wrapper.find('[data-test-subj="addExceptionConfirmButton"]').at(1).text()).toEqual(
          i18n.ADD_ENDPOINT_EXCEPTION
        );
      });

      it('should render item name input', () => {
        expect(wrapper.find('[data-test-subj="exceptionFlyoutNameInput"]').exists()).toBeTruthy();
      });

      it('should render the exception builder', () => {
        expect(wrapper.find('[data-test-subj="alertExceptionBuilder"]').exists()).toBeTruthy();
      });

      it('does NOT render options to add exception to a rule or shared list', () => {
        expect(
          wrapper.find('[data-test-subj="exceptionItemAddToRuleOrListSection"]').exists()
        ).toBeFalsy();
      });

      it('should contain the endpoint specific documentation text', () => {
        expect(wrapper.find('[data-test-subj="addExceptionEndpointText"]').exists()).toBeTruthy();
      });

      it('should NOT display the eql sequence callout', () => {
        expect(wrapper.find('[data-test-subj="eqlSequenceCallout"]').exists()).not.toBeTruthy();
      });
    });

    describe('alert data is passed in', () => {
      let wrapper: ReactWrapper;
      beforeEach(async () => {
        wrapper = mount(
          <TestProviders>
            <AddExceptionFlyout
              rules={[
                {
                  ...getRulesSchemaMock(),
                  index: ['filebeat-*'],
                  exceptions_list: [
                    {
                      id: 'endpoint_list',
                      list_id: 'endpoint_list',
                      namespace_type: 'agnostic',
                      type: 'endpoint',
                    },
                  ],
                } as Rule,
              ]}
              isBulkAction={false}
              alertData={alertDataMock}
              isAlertDataLoading={false}
              alertStatus="open"
              isEndpointItem
              showAlertCloseOptions
              onCancel={jest.fn()}
              onConfirm={jest.fn()}
            />
          </TestProviders>
        );
        const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
        await waitFor(() =>
          callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] })
        );
      });

      it('should prepopulate endpoint items', () => {
        expect(defaultEndpointItems).toHaveBeenCalled();
      });

      it('should render the close single alert checkbox', () => {
        expect(
          wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').exists()
        ).toBeTruthy();
      });

      it('should have the bulk close alerts checkbox disabled', () => {
        expect(
          wrapper.find('input[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').getDOMNode()
        ).toBeDisabled();
      });

      it('should NOT render the os selection dropdown', () => {
        expect(wrapper.find('[data-test-subj="osSelectionDropdown"]').exists()).toBeFalsy();
      });
    });

    describe('bulk closeable alert data is passed in', () => {
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
        wrapper = mount(
          <TestProviders>
            <AddExceptionFlyout
              rules={[
                {
                  ...getRulesSchemaMock(),
                  index: ['filebeat-*'],
                  exceptions_list: [
                    {
                      id: 'endpoint_list',
                      list_id: 'endpoint_list',
                      namespace_type: 'agnostic',
                      type: 'endpoint',
                    },
                  ],
                } as Rule,
              ]}
              isBulkAction={false}
              alertData={alertDataMock}
              isAlertDataLoading={false}
              alertStatus="open"
              isEndpointItem
              showAlertCloseOptions
              onCancel={jest.fn()}
              onConfirm={jest.fn()}
            />
          </TestProviders>
        );
        const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
        await waitFor(() =>
          callProps.onChange({
            exceptionItems: [
              {
                ...getExceptionListItemSchemaMock(),
                entries: [{ field: 'file.hash.sha256', operator: 'included', type: 'match' }],
              },
            ],
          })
        );
      });

      it('should prepopulate endpoint items', () => {
        expect(defaultEndpointItems).toHaveBeenCalled();
      });

      it('should render the close single alert checkbox', () => {
        expect(
          wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').exists()
        ).toBeTruthy();
      });

      it('should have the bulk close checkbox enabled', () => {
        expect(
          wrapper.find('input[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').getDOMNode()
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
              .find('input[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]')
              .getDOMNode()
          ).toBeDisabled();
        });
      });
    });

    describe('alert data NOT passed in', () => {
      let wrapper: ReactWrapper;
      beforeEach(async () => {
        wrapper = mount(
          <TestProviders>
            <AddExceptionFlyout
              rules={[
                {
                  ...getRulesSchemaMock(),
                  index: ['filebeat-*'],
                  exceptions_list: [
                    {
                      id: 'endpoint_list',
                      list_id: 'endpoint_list',
                      namespace_type: 'agnostic',
                      type: 'endpoint',
                    },
                  ],
                } as Rule,
              ]}
              isBulkAction={false}
              alertData={undefined}
              isAlertDataLoading={undefined}
              alertStatus={undefined}
              isEndpointItem
              showAlertCloseOptions
              onCancel={jest.fn()}
              onConfirm={jest.fn()}
            />
          </TestProviders>
        );
        const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
        await waitFor(() =>
          callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] })
        );
      });

      it('should NOT render the close single alert checkbox', () => {
        expect(
          wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').exists()
        ).toBeFalsy();
      });

      it('should render the os selection dropdown', () => {
        expect(wrapper.find('[data-test-subj="osSelectionDropdown"]').exists()).toBeTruthy();
      });
    });
  });

  describe('exception list type is NOT "endpoint" ("rule_default" or "detection")', () => {
    describe('common features to test regardless of alert input', () => {
      let wrapper: ReactWrapper;
      beforeEach(async () => {
        wrapper = mount(
          <TestProviders>
            <AddExceptionFlyout
              rules={[
                {
                  ...getRulesSchemaMock(),
                  exceptions_list: [],
                } as Rule,
              ]}
              isBulkAction={false}
              alertData={alertDataMock}
              isAlertDataLoading={false}
              alertStatus="open"
              isEndpointItem={false}
              showAlertCloseOptions
              onCancel={jest.fn()}
              onConfirm={jest.fn()}
            />
          </TestProviders>
        );
        const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
        await waitFor(() =>
          callProps.onChange({ exceptionItems: [getExceptionListItemSchemaMock()] })
        );
      });

      it('displays proper flyout and button text', () => {
        expect(wrapper.find('[data-test-subj="exceptionFlyoutTitle"]').at(1).text()).toEqual(
          i18n.CREATE_RULE_EXCEPTION
        );
        expect(wrapper.find('[data-test-subj="addExceptionConfirmButton"]').at(1).text()).toEqual(
          i18n.CREATE_RULE_EXCEPTION
        );
      });

      it('should NOT prepopulate items', () => {
        expect(defaultEndpointItems).not.toHaveBeenCalled();
      });

      // button is disabled until there are exceptions, a name, and selection made on
      // add to rule or lists section
      it('has the add exception button disabled', () => {
        expect(
          wrapper.find('button[data-test-subj="addExceptionConfirmButton"]').getDOMNode()
        ).toBeDisabled();
      });

      it('should render item name input', () => {
        expect(wrapper.find('[data-test-subj="exceptionFlyoutNameInput"]').exists()).toBeTruthy();
      });

      it('should NOT render the os selection dropdown', () => {
        expect(wrapper.find('[data-test-subj="osSelectionDropdown"]').exists()).toBeFalsy();
      });

      it('should render the exception builder', () => {
        expect(wrapper.find('[data-test-subj="alertExceptionBuilder"]').exists()).toBeTruthy();
      });

      it('renders options to add exception to a rule or shared list and has "add to rule" selected by default', () => {
        expect(
          wrapper.find('[data-test-subj="exceptionItemAddToRuleOrListSection"]').exists()
        ).toBeTruthy();
        expect(
          wrapper.find('[data-test-subj="addToRuleOptionsRadio"] input').getDOMNode()
        ).toBeChecked();
      });

      it('should NOT contain the endpoint specific documentation text', () => {
        expect(wrapper.find('[data-test-subj="addExceptionEndpointText"]').exists()).toBeFalsy();
      });

      it('should NOT display the eql sequence callout', () => {
        expect(wrapper.find('[data-test-subj="eqlSequenceCallout"]').exists()).not.toBeTruthy();
      });
    });

    describe('alert data is passed in', () => {
      let wrapper: ReactWrapper;
      beforeEach(async () => {
        wrapper = mount(
          <TestProviders>
            <AddExceptionFlyout
              rules={[
                {
                  ...getRulesSchemaMock(),
                  exceptions_list: [],
                } as Rule,
              ]}
              isBulkAction={false}
              alertData={alertDataMock}
              isAlertDataLoading={false}
              alertStatus="open"
              isEndpointItem={false}
              showAlertCloseOptions
              onCancel={jest.fn()}
              onConfirm={jest.fn()}
            />
          </TestProviders>
        );
        const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
        await waitFor(() =>
          callProps.onChange({ exceptionItems: [getExceptionListItemSchemaMock()] })
        );
      });

      it('should render the close single alert checkbox', () => {
        expect(
          wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').exists()
        ).toBeTruthy();
        expect(
          wrapper.find('input[data-test-subj="closeAlertOnAddExceptionCheckbox"]').getDOMNode()
        ).not.toBeDisabled();
      });

      it('should have the bulk close checkbox disabled', () => {
        expect(
          wrapper.find('input[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').getDOMNode()
        ).toBeDisabled();
      });
    });

    describe('bulk closeable alert data is passed in', () => {
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
        wrapper = mount(
          <TestProviders>
            <AddExceptionFlyout
              rules={[
                {
                  ...getRulesSchemaMock(),
                  index: ['filebeat-*'],
                  exceptions_list: [
                    {
                      id: 'endpoint_list',
                      list_id: 'endpoint_list',
                      namespace_type: 'agnostic',
                      type: 'endpoint',
                    },
                  ],
                } as Rule,
              ]}
              isBulkAction={false}
              alertData={alertDataMock}
              isAlertDataLoading={false}
              alertStatus="open"
              isEndpointItem={false}
              showAlertCloseOptions
              onCancel={jest.fn()}
              onConfirm={jest.fn()}
            />
          </TestProviders>
        );

        const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
        await waitFor(() =>
          callProps.onChange({
            exceptionItems: [
              {
                ...getExceptionListItemSchemaMock(),
                entries: [{ field: 'file.hash.sha256', operator: 'included', type: 'match' }],
              },
            ],
          })
        );
      });

      it('should render the close single alert checkbox', () => {
        expect(
          wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').exists()
        ).toBeTruthy();
        expect(
          wrapper.find('input[data-test-subj="closeAlertOnAddExceptionCheckbox"]').getDOMNode()
        ).not.toBeDisabled();
      });

      it('should have the bulk close checkbox enabled', () => {
        expect(
          wrapper.find('input[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').getDOMNode()
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
              .find('input[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]')
              .getDOMNode()
          ).toBeDisabled();
        });
      });
    });

    describe('alert data NOT passed in', () => {
      let wrapper: ReactWrapper;
      beforeEach(async () => {
        wrapper = mount(
          <TestProviders>
            <AddExceptionFlyout
              rules={[
                {
                  ...getRulesSchemaMock(),
                  index: ['filebeat-*'],
                  exceptions_list: [
                    {
                      id: 'endpoint_list',
                      list_id: 'endpoint_list',
                      namespace_type: 'agnostic',
                      type: 'endpoint',
                    },
                  ],
                } as Rule,
              ]}
              isBulkAction={false}
              alertData={undefined}
              isAlertDataLoading={undefined}
              alertStatus={undefined}
              isEndpointItem={false}
              showAlertCloseOptions
              onCancel={jest.fn()}
              onConfirm={jest.fn()}
            />
          </TestProviders>
        );
        const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
        await waitFor(() =>
          callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] })
        );
      });

      it('should NOT render the close single alert checkbox', () => {
        expect(
          wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').exists()
        ).toBeFalsy();
      });

      it('should have the bulk close checkbox disabled', () => {
        expect(
          wrapper.find('input[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').getDOMNode()
        ).toBeDisabled();
      });
    });
  });

  /* Say for example, from the lists management or lists details page */
  describe('when no rules are passed in', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            rules={null}
            isBulkAction={false}
            alertData={undefined}
            isAlertDataLoading={undefined}
            alertStatus={undefined}
            isEndpointItem={false}
            showAlertCloseOptions
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </TestProviders>
      );
      const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
      await waitFor(() =>
        callProps.onChange({ exceptionItems: [getExceptionListItemSchemaMock()] })
      );
    });

    it('allows large value lists', () => {
      expect(wrapper.find('ExceptionsConditions').prop('allowLargeValueLists')).toBeTruthy();
    });

    it('defaults to selecting add to rule option, displaying rules selection table', () => {
      expect(wrapper.find('[data-test-subj="addExceptionToRulesTable"]').exists()).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="selectRulesToAddToOptionRadio"] input').getDOMNode()
      ).toHaveAttribute('checked');
    });
  });

  /* Say for example, from the rule details page, exceptions tab, or from an alert */
  describe('when a single rule is passed in', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            rules={[
              {
                ...getRulesSchemaMock(),
                exceptions_list: [],
              } as Rule,
            ]}
            isBulkAction={false}
            alertData={undefined}
            isAlertDataLoading={undefined}
            alertStatus={undefined}
            isEndpointItem={false}
            showAlertCloseOptions
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </TestProviders>
      );
      const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
      await waitFor(() =>
        callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] })
      );
    });
    it('does not allow large value list selection for query rule', () => {
      const shallowWrapper = shallow(
        <AddExceptionFlyout
          rules={[
            {
              ...getRulesSchemaMock(),
              exceptions_list: [],
            } as Rule,
          ]}
          isBulkAction={false}
          alertData={alertDataMock}
          isAlertDataLoading={false}
          alertStatus="open"
          isEndpointItem={false}
          showAlertCloseOptions
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />
      );

      expect(shallowWrapper.find('ExceptionsConditions').prop('allowLargeValueLists')).toBeTruthy();
    });

    it('does not allow large value list selection if EQL rule', () => {
      const shallowWrapper = shallow(
        <AddExceptionFlyout
          rules={[
            {
              ...getRulesEqlSchemaMock(),
              exceptions_list: [],
            } as Rule,
          ]}
          isBulkAction={false}
          alertData={alertDataMock}
          isAlertDataLoading={false}
          alertStatus="open"
          isEndpointItem={false}
          showAlertCloseOptions
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />
      );

      expect(shallowWrapper.find('ExceptionsConditions').prop('allowLargeValueLists')).toBeFalsy();
    });

    it('does not allow large value list selection if threshold rule', () => {
      const shallowWrapper = shallow(
        <AddExceptionFlyout
          rules={[
            {
              ...getRulesSchemaMock(),
              type: 'threshold',
            } as Rule,
          ]}
          isBulkAction={false}
          alertData={alertDataMock}
          isAlertDataLoading={false}
          alertStatus="open"
          isEndpointItem={false}
          showAlertCloseOptions
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />
      );

      expect(shallowWrapper.find('ExceptionsConditions').prop('allowLargeValueLists')).toBeFalsy();
    });

    it('does not allow large value list selection if new trems rule', () => {
      const shallowWrapper = shallow(
        <AddExceptionFlyout
          rules={[
            {
              ...getRulesSchemaMock(),
              type: 'new_terms',
            } as Rule,
          ]}
          isBulkAction={false}
          alertData={alertDataMock}
          isAlertDataLoading={false}
          alertStatus="open"
          isEndpointItem={false}
          showAlertCloseOptions
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />
      );

      expect(shallowWrapper.find('ExceptionsConditions').prop('allowLargeValueLists')).toBeFalsy();
    });

    it('defaults to selecting add to rule radio option', () => {
      expect(
        wrapper.find('[data-test-subj="exceptionItemAddToRuleOrListSection"]').exists()
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="addToRuleOptionsRadio"] input').getDOMNode()
      ).toBeChecked();
    });

    it('disables add to shared lists option if rule has no shared exception lists attached already', () => {
      expect(
        wrapper.find('[data-test-subj="addToListsRadioOption"] input').getDOMNode()
      ).toBeDisabled();
    });

    it('enables add to shared lists option if rule has shared list', () => {
      wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            rules={[
              {
                ...getRulesSchemaMock(),
                exceptions_list: [
                  {
                    id: 'test',
                    list_id: 'test',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                ],
              } as Rule,
            ]}
            isBulkAction={false}
            alertData={undefined}
            isAlertDataLoading={undefined}
            alertStatus={undefined}
            isEndpointItem={false}
            showAlertCloseOptions
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="addToListsRadioOption"] input').getDOMNode()
      ).toBeEnabled();
    });
  });

  /* Say for example, add exception item from rules bulk action */
  describe('when multiple rules are passed in - bulk action', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            rules={[
              {
                ...getRulesSchemaMock(),
                exceptions_list: [],
              } as Rule,
              {
                ...getRulesSchemaMock(),
                id: 'foo',
                rule_id: 'foo',
                exceptions_list: [
                  {
                    id: 'bar',
                    list_id: 'bar',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                ],
              } as Rule,
            ]}
            isBulkAction
            alertData={undefined}
            isAlertDataLoading={undefined}
            alertStatus={undefined}
            isEndpointItem={false}
            showAlertCloseOptions
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </TestProviders>
      );
      const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
      await waitFor(() =>
        callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] })
      );
    });

    it('allows large value lists', () => {
      const shallowWrapper = shallow(
        <AddExceptionFlyout
          rules={[
            {
              ...getRulesSchemaMock(),
              exceptions_list: [],
            } as Rule,
            {
              ...getRulesSchemaMock(),
              id: 'foo',
              rule_id: 'foo',
              exceptions_list: [],
            } as Rule,
          ]}
          isBulkAction
          alertData={alertDataMock}
          isAlertDataLoading={false}
          alertStatus="open"
          isEndpointItem={false}
          showAlertCloseOptions
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />
      );

      expect(shallowWrapper.find('ExceptionsConditions').prop('allowLargeValueLists')).toBeTruthy();
    });

    it('defaults to selecting add to rules radio option', () => {
      expect(
        wrapper.find('[data-test-subj="exceptionItemAddToRuleOrListSection"]').exists()
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="addToRulesOptionsRadio"] input').getDOMNode()
      ).toBeChecked();
    });

    it('disables add to shared lists option if rules have no shared lists in common', () => {
      expect(
        wrapper.find('[data-test-subj="addToListsRadioOption"] input').getDOMNode()
      ).toBeDisabled();
    });

    it('enables add to shared lists option if rules have at least one shared list in common', () => {
      wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            rules={[
              {
                ...getRulesSchemaMock(),
                exceptions_list: [
                  {
                    id: 'bar',
                    list_id: 'bar',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                ],
              } as Rule,
              {
                ...getRulesSchemaMock(),
                id: 'foo',
                rule_id: 'foo',
                exceptions_list: [
                  {
                    id: 'bar',
                    list_id: 'bar',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                ],
              } as Rule,
            ]}
            isBulkAction
            alertData={undefined}
            isAlertDataLoading={undefined}
            alertStatus={undefined}
            isEndpointItem={false}
            showAlertCloseOptions
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="addToListsRadioOption"] input').getDOMNode()
      ).toBeEnabled();
    });
  });

  describe('when there is an exception being created on a sequence eql rule type', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            rules={[
              {
                ...getRulesEqlSchemaMock(),
                query:
                  'sequence [process where process.name = "test.exe"] [process where process.name = "explorer.exe"]',
              } as Rule,
            ]}
            isBulkAction={false}
            alertData={alertDataMock}
            isAlertDataLoading={false}
            alertStatus="open"
            isEndpointItem={false}
            showAlertCloseOptions
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </TestProviders>
      );
      const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
      await waitFor(() =>
        callProps.onChange({ exceptionItems: [getExceptionListItemSchemaMock()] })
      );
    });

    it('should render the exception builder', () => {
      expect(wrapper.find('[data-test-subj="alertExceptionBuilder"]').exists()).toBeTruthy();
    });

    it('should not prepopulate endpoint items', () => {
      expect(defaultEndpointItems).not.toHaveBeenCalled();
    });

    it('should render the close single alert checkbox', () => {
      expect(
        wrapper.find('[data-test-subj="closeAlertOnAddExceptionCheckbox"]').exists()
      ).toBeTruthy();
    });

    it('should have the bulk close checkbox disabled', () => {
      expect(
        wrapper.find('input[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').getDOMNode()
      ).toBeDisabled();
    });

    it('should display the eql sequence callout', () => {
      expect(wrapper.find('[data-test-subj="eqlSequenceCallout"]').exists()).toBeTruthy();
    });
  });

  describe('error states', () => {
    test('when there are exception builder errors submit button is disabled', async () => {
      const wrapper = mount(
        <TestProviders>
          <AddExceptionFlyout
            rules={[
              {
                ...getRulesSchemaMock(),
              } as Rule,
            ]}
            isBulkAction={false}
            alertData={undefined}
            isAlertDataLoading={undefined}
            alertStatus={undefined}
            isEndpointItem={false}
            showAlertCloseOptions
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </TestProviders>
      );
      const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
      await waitFor(() => callProps.onChange({ exceptionItems: [], errorExists: true }));
      expect(
        wrapper.find('button[data-test-subj="addExceptionConfirmButton"]').getDOMNode()
      ).toBeDisabled();
    });
  });
});
