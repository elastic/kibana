/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../common/mock';

import { EditExceptionFlyout } from '.';
import { useCurrentUser } from '../../../../common/lib/kibana';
import { useFetchIndex } from '../../../../common/containers/source';
import { createStubIndexPattern, stubIndexPattern } from '@kbn/data-plugin/common/stubs';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type { Rule } from '../../../rule_management/logic/types';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  getRulesEqlSchemaMock,
  getRulesSchemaMock,
} from '../../../../../common/detection_engine/rule_schema/mocks';

import { getMockTheme } from '../../../../common/lib/kibana/kibana_react.mock';
import { getExceptionBuilderComponentLazy } from '@kbn/lists-plugin/public';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import { useFetchIndexPatterns } from '../../logic/use_exception_flyout_data';
import { useCreateOrUpdateException } from '../../logic/use_create_update_exception';
import { useFindExceptionListReferences } from '../../logic/use_find_references';
import * as i18n from './translations';

const mockTheme = getMockTheme({
  eui: {
    euiBreakpoints: {
      l: '1200px',
    },
    euiSizeM: '10px',
  },
});

jest.mock('../../../../common/lib/kibana');
jest.mock('../../logic/use_create_update_exception');
jest.mock('../../logic/use_exception_flyout_data');
jest.mock('../../../../common/containers/source');
jest.mock('../../logic/use_find_references');
jest.mock('../../logic/use_fetch_or_create_rule_exception_list');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('../../../rule_management/logic/use_rule');
jest.mock('@kbn/lists-plugin/public');

const mockGetExceptionBuilderComponentLazy = getExceptionBuilderComponentLazy as jest.Mock<
  ReturnType<typeof getExceptionBuilderComponentLazy>
>;
const mockUseSignalIndex = useSignalIndex as jest.Mock<Partial<ReturnType<typeof useSignalIndex>>>;
const mockUseFetchIndex = useFetchIndex as jest.Mock;
const mockUseCurrentUser = useCurrentUser as jest.Mock<Partial<ReturnType<typeof useCurrentUser>>>;
const mockFetchIndexPatterns = useFetchIndexPatterns as jest.Mock<
  ReturnType<typeof useFetchIndexPatterns>
>;
const mockUseAddOrUpdateException = useCreateOrUpdateException as jest.Mock<
  ReturnType<typeof useCreateOrUpdateException>
>;
const mockUseFindExceptionListReferences = useFindExceptionListReferences as jest.Mock;

describe('When the edit exception modal is opened', () => {
  beforeEach(() => {
    const emptyComp = <span data-test-subj="edit-exception-builder" />;
    mockGetExceptionBuilderComponentLazy.mockReturnValue(emptyComp);
    mockUseSignalIndex.mockReturnValue({
      loading: false,
      signalIndexName: 'test-signal',
    });
    mockUseAddOrUpdateException.mockImplementation(() => [false, jest.fn()]);
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
    mockUseCurrentUser.mockReturnValue({ username: 'test-username' });
    mockFetchIndexPatterns.mockImplementation(() => ({
      isLoading: false,
      indexPatterns: stubIndexPattern,
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
                  id: '1234',
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
    it('renders the loading spinner', async () => {
      // Mocks one of the hooks as loading
      mockFetchIndexPatterns.mockImplementation(() => ({
        isLoading: true,
        indexPatterns: { fields: [], title: 'foo' },
      }));

      const wrapper = mount(
        <TestProviders>
          <EditExceptionFlyout
            list={getExceptionListSchemaMock()}
            itemToEdit={getExceptionListItemSchemaMock()}
            showAlertCloseOptions
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </TestProviders>
      );
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="loadingEditExceptionFlyout"]').exists()).toBeTruthy();
      });
    });
  });

  describe('exception list type of "endpoint"', () => {
    mockUseFindExceptionListReferences.mockImplementation(() => [
      false,
      false,
      {
        endpoint_list: {
          ...getExceptionListSchemaMock(),
          id: '123',
          list_id: 'endpoint_list',
          namespace_type: 'agnostic',
          type: ExceptionListTypeEnum.ENDPOINT,
          name: 'My exception list',
          referenced_rules: [
            {
              id: '345',
              name: 'My rule',
              rule_id: 'my_rule_id',
              exception_lists: [
                {
                  id: 'endpoint_list',
                  list_id: 'endpoint_list',
                  namespace_type: 'single',
                  type: ExceptionListTypeEnum.ENDPOINT,
                },
              ],
            },
          ],
        },
      },
      jest.fn(),
    ]);

    describe('common functionality to test', () => {
      let wrapper: ReactWrapper;
      beforeEach(async () => {
        wrapper = mount(
          <TestProviders>
            <EditExceptionFlyout
              list={{
                ...getExceptionListSchemaMock(),
                type: 'endpoint',
                namespace_type: 'agnostic',
                list_id: 'endpoint_list',
                id: 'endpoint_list',
              }}
              rule={
                {
                  ...getRulesSchemaMock(),
                  exceptions_list: [
                    {
                      id: 'endpoint_list',
                      list_id: 'endpoint_list',
                      type: 'endpoint',
                      namespace_type: 'agnostic',
                    },
                  ],
                } as Rule
              }
              itemToEdit={getExceptionListItemSchemaMock()}
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
          i18n.EDIT_ENDPOINT_EXCEPTION_TITLE
        );
        expect(wrapper.find('[data-test-subj="editExceptionConfirmButton"]').at(1).text()).toEqual(
          i18n.EDIT_ENDPOINT_EXCEPTION_TITLE
        );
      });

      it('should render item name input', () => {
        expect(wrapper.find('[data-test-subj="exceptionFlyoutNameInput"]').exists()).toBeTruthy();
      });

      it('should render OS info', () => {
        expect(wrapper.find('[data-test-subj="exceptionItemSelectedOs"]').exists()).toBeTruthy();
      });

      it('should render the exception builder', () => {
        expect(wrapper.find('ExceptionsConditions').exists()).toBeTruthy();
      });

      it('does NOT render section showing list or rule item assigned to', () => {
        expect(
          wrapper.find('[data-test-subj="exceptionItemLinkedToListSection"]').exists()
        ).toBeFalsy();
        expect(
          wrapper.find('[data-test-subj="exceptionItemLinkedToRuleSection"]').exists()
        ).toBeFalsy();
      });

      it('should contain the endpoint specific documentation text', () => {
        expect(wrapper.find('[data-test-subj="addExceptionEndpointText"]').exists()).toBeTruthy();
      });

      it('should NOT display the eql sequence callout', () => {
        expect(wrapper.find('[data-test-subj="eqlSequenceCallout"]').exists()).not.toBeTruthy();
      });
    });

    describe('when exception entry fields and index allow user to bulk close', () => {
      let wrapper: ReactWrapper;
      beforeEach(async () => {
        const exceptionItemMock = {
          ...getExceptionListItemSchemaMock(),
          entries: [
            { field: 'file.hash.sha256', operator: 'included', type: 'match' },
          ] as EntriesArray,
        };
        wrapper = mount(
          <ThemeProvider theme={mockTheme}>
            <EditExceptionFlyout
              rule={
                {
                  ...getRulesSchemaMock(),
                  exceptions_list: [
                    {
                      id: 'endpoint_list',
                      list_id: 'endpoint_list',
                      type: 'endpoint',
                      namespace_type: 'agnostic',
                    },
                  ],
                } as Rule
              }
              list={{
                ...getExceptionListSchemaMock(),
                type: 'endpoint',
                namespace_type: 'agnostic',
                list_id: 'endpoint_list',
                id: 'endpoint_list',
              }}
              itemToEdit={exceptionItemMock}
              showAlertCloseOptions
              onCancel={jest.fn()}
              onConfirm={jest.fn()}
            />
          </ThemeProvider>
        );
        const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
        await waitFor(() =>
          callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] })
        );
      });

      it('should have the bulk close checkbox enabled', () => {
        expect(
          wrapper.find('input[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').getDOMNode()
        ).not.toBeDisabled();
      });
    });

    describe('when entry has non ecs type', () => {
      let wrapper: ReactWrapper;
      beforeEach(async () => {
        wrapper = mount(
          <ThemeProvider theme={mockTheme}>
            <EditExceptionFlyout
              list={{
                ...getExceptionListSchemaMock(),
                type: 'endpoint',
                namespace_type: 'agnostic',
                list_id: 'endpoint_list',
                id: 'endpoint_list',
              }}
              rule={
                {
                  ...getRulesSchemaMock(),
                  exceptions_list: [
                    {
                      id: 'endpoint_list',
                      list_id: 'endpoint_list',
                      type: 'endpoint',
                      namespace_type: 'agnostic',
                    },
                  ],
                } as Rule
              }
              itemToEdit={getExceptionListItemSchemaMock()}
              showAlertCloseOptions
              onCancel={jest.fn()}
              onConfirm={jest.fn()}
            />
          </ThemeProvider>
        );
        const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
        await waitFor(() => {
          callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] });
        });
      });

      it('should have the bulk close checkbox disabled', () => {
        expect(
          wrapper.find('input[data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"]').getDOMNode()
        ).toBeDisabled();
      });
    });
  });

  describe('exception list type of "detection"', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      wrapper = mount(
        <TestProviders>
          <EditExceptionFlyout
            list={{
              ...getExceptionListSchemaMock(),
              type: 'detection',
              namespace_type: 'single',
              list_id: 'my_list_id',
              id: '1234',
            }}
            rule={
              {
                ...getRulesSchemaMock(),
                id: '345',
                name: 'My rule',
                rule_id: 'my_rule_id',
                exceptions_list: [
                  {
                    id: '1234',
                    list_id: 'my_list_id',
                    type: 'detection',
                    namespace_type: 'single',
                  },
                ],
              } as Rule
            }
            itemToEdit={getExceptionListItemSchemaMock()}
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
        i18n.EDIT_EXCEPTION_TITLE
      );
      expect(wrapper.find('[data-test-subj="editExceptionConfirmButton"]').at(1).text()).toEqual(
        i18n.EDIT_EXCEPTION_TITLE
      );
    });

    it('should render item name input', () => {
      expect(wrapper.find('[data-test-subj="exceptionFlyoutNameInput"]').exists()).toBeTruthy();
    });

    it('should not render OS info', () => {
      expect(wrapper.find('[data-test-subj="exceptionItemSelectedOs"]').exists()).toBeFalsy();
    });

    it('should render the exception builder', () => {
      expect(wrapper.find('ExceptionsConditions').exists()).toBeTruthy();
    });

    it('does render section showing list item is assigned to', () => {
      expect(
        wrapper.find('[data-test-subj="exceptionItemLinkedToListSection"]').exists()
      ).toBeTruthy();
    });

    it('does NOT render section showing rule item is assigned to', () => {
      expect(
        wrapper.find('[data-test-subj="exceptionItemLinkedToRuleSection"]').exists()
      ).toBeFalsy();
    });

    it('should NOT contain the endpoint specific documentation text', () => {
      expect(wrapper.find('[data-test-subj="addExceptionEndpointText"]').exists()).toBeFalsy();
    });

    it('should NOT display the eql sequence callout', () => {
      expect(wrapper.find('[data-test-subj="eqlSequenceCallout"]').exists()).toBeFalsy();
    });
  });

  describe('exception list type of "rule_default"', () => {
    mockUseFindExceptionListReferences.mockImplementation(() => [
      false,
      false,
      {
        my_list_id: {
          ...getExceptionListSchemaMock(),
          id: '123',
          list_id: 'my_list_id',
          namespace_type: 'single',
          type: ExceptionListTypeEnum.RULE_DEFAULT,
          name: 'My exception list',
          referenced_rules: [
            {
              id: '345',
              name: 'My rule',
              rule_id: 'my_rule_id',
              exception_lists: [
                {
                  id: '1234',
                  list_id: 'my_list_id',
                  namespace_type: 'single',
                  type: ExceptionListTypeEnum.RULE_DEFAULT,
                },
              ],
            },
          ],
        },
      },
      jest.fn(),
    ]);

    let wrapper: ReactWrapper;
    beforeEach(async () => {
      wrapper = mount(
        <TestProviders>
          <EditExceptionFlyout
            list={{
              ...getExceptionListSchemaMock(),
              type: 'rule_default',
              namespace_type: 'single',
              list_id: 'my_list_id',
              id: '1234',
            }}
            rule={
              {
                ...getRulesSchemaMock(),
                id: '345',
                name: 'My rule',
                rule_id: 'my_rule_id',
                exceptions_list: [
                  {
                    id: '1234',
                    list_id: 'my_list_id',
                    type: 'rule_default',
                    namespace_type: 'single',
                  },
                ],
              } as Rule
            }
            itemToEdit={getExceptionListItemSchemaMock()}
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
        i18n.EDIT_EXCEPTION_TITLE
      );
      expect(wrapper.find('[data-test-subj="editExceptionConfirmButton"]').at(1).text()).toEqual(
        i18n.EDIT_EXCEPTION_TITLE
      );
    });

    it('should render item name input', () => {
      expect(wrapper.find('[data-test-subj="exceptionFlyoutNameInput"]').exists()).toBeTruthy();
    });

    it('should not render OS info', () => {
      expect(wrapper.find('[data-test-subj="exceptionItemSelectedOs"]').exists()).toBeFalsy();
    });

    it('should render the exception builder', () => {
      expect(wrapper.find('ExceptionsConditions').exists()).toBeTruthy();
    });

    it('does NOT render section showing list item is assigned to', () => {
      expect(
        wrapper.find('[data-test-subj="exceptionItemLinkedToListSection"]').exists()
      ).toBeFalsy();
    });

    it('does render section showing rule item is assigned to', () => {
      expect(
        wrapper.find('[data-test-subj="exceptionItemLinkedToRuleSection"]').exists()
      ).toBeTruthy();
    });

    it('should NOT contain the endpoint specific documentation text', () => {
      expect(wrapper.find('[data-test-subj="addExceptionEndpointText"]').exists()).toBeFalsy();
    });

    it('should NOT display the eql sequence callout', () => {
      expect(wrapper.find('[data-test-subj="eqlSequenceCallout"]').exists()).toBeFalsy();
    });
  });

  describe('when an exception assigned to a sequence eql rule type is passed', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      wrapper = mount(
        <TestProviders>
          <EditExceptionFlyout
            list={{
              ...getExceptionListSchemaMock(),
              type: 'detection',
              namespace_type: 'single',
              list_id: 'my_list_id',
              id: '1234',
            }}
            rule={
              {
                ...getRulesEqlSchemaMock(),
                id: '345',
                name: 'My rule',
                rule_id: 'my_rule_id',
                query:
                  'sequence [process where process.name = "test.exe"] [process where process.name = "explorer.exe"]',
                exceptions_list: [
                  {
                    id: '1234',
                    list_id: 'my_list_id',
                    type: 'detection',
                    namespace_type: 'single',
                  },
                ],
              } as Rule
            }
            itemToEdit={getExceptionListItemSchemaMock()}
            showAlertCloseOptions
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </TestProviders>
      );
      const callProps = (getExceptionBuilderComponentLazy as jest.Mock).mock.calls[0][0];
      await waitFor(() => {
        callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] });
      });
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
    test('when there are exception builder errors has submit button disabled', async () => {
      const wrapper = mount(
        <TestProviders>
          <EditExceptionFlyout
            list={{
              ...getExceptionListSchemaMock(),
              type: 'detection',
              namespace_type: 'single',
              list_id: 'my_list_id',
              id: '1234',
            }}
            rule={
              {
                ...getRulesSchemaMock(),
                id: '345',
                name: 'My rule',
                rule_id: 'my_rule_id',
                exceptions_list: [
                  {
                    id: '1234',
                    list_id: 'my_list_id',
                    type: 'detection',
                    namespace_type: 'single',
                  },
                ],
              } as Rule
            }
            itemToEdit={getExceptionListItemSchemaMock()}
            showAlertCloseOptions
            onCancel={jest.fn()}
            onConfirm={jest.fn()}
          />
        </TestProviders>
      );
      const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
      await waitFor(() => callProps.onChange({ exceptionItems: [], errorExists: true }));

      expect(
        wrapper.find('button[data-test-subj="editExceptionConfirmButton"]').getDOMNode()
      ).toBeDisabled();
    });
  });
});
