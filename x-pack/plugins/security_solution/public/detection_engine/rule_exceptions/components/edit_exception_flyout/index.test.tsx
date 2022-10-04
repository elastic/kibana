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
import { stubIndexPattern } from '@kbn/data-plugin/common/stubs';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { getRulesEqlSchemaMock } from '../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { useRuleAsync } from '../../../../detections/containers/detection_engine/rules/use_rule_async';
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
jest.mock('../../../../detections/containers/detection_engine/rules');
jest.mock('../../logic/use_create_update_exception');
jest.mock('../../logic/use_exception_flyout_data');
jest.mock('../../../../common/containers/source');
jest.mock('../../logic/use_find_references');
jest.mock('../../logic/use_fetch_or_create_rule_exception_list');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('../../../../detections/containers/detection_engine/rules/use_rule_async');
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
  const ruleName = 'test rule';

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
        indexPatterns: stubIndexPattern,
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
    describe('common functionality to test regardless of alert input', () => {
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

      it('should render the exception builder', () => {
        expect(wrapper.find('[data-test-subj="alertExceptionBuilder"]').exists()).toBeTruthy();
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
  });

  xdescribe('when an endpoint exception with exception data is passed', () => {
    describe('when exception entry fields are included in the index pattern', () => {
      let wrapper: ReactWrapper;
      beforeEach(async () => {
        const exceptionItemMock = {
          ...getExceptionListItemSchemaMock(),
          entries: [
            { field: 'response', operator: 'included', type: 'match', value: '3' },
          ] as EntriesArray,
        };
        wrapper = mount(
          <ThemeProvider theme={mockTheme}>
            <EditExceptionFlyout
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
        const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
        await waitFor(() => {
          callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] });
        });
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
        expect(wrapper.find('[data-test-subj="edit-exception-builder"]').exists()).toBeTruthy();
      });
      it('should contain the endpoint specific documentation text', () => {
        expect(
          wrapper.find('[data-test-subj="edit-exception-endpoint-text"]').exists()
        ).toBeTruthy();
      });
    });

    describe("when exception entry fields aren't included in the index pattern", () => {
      let wrapper: ReactWrapper;
      beforeEach(async () => {
        wrapper = mount(
          <ThemeProvider theme={mockTheme}>
            <EditExceptionFlyout
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
        const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
        await waitFor(() => {
          callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] });
        });
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
        expect(wrapper.find('[data-test-subj="edit-exception-builder"]').exists()).toBeTruthy();
      });
      it('should contain the endpoint specific documentation text', () => {
        expect(
          wrapper.find('[data-test-subj="edit-exception-endpoint-text"]').exists()
        ).toBeTruthy();
      });
    });
  });

  xdescribe('when an exception assigned to a sequence eql rule type is passed', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      (useRuleAsync as jest.Mock).mockImplementation(() => ({
        rule: {
          ...getRulesEqlSchemaMock(),
          query:
            'sequence [process where process.name = "test.exe"] [process where process.name = "explorer.exe"]',
        },
      }));
      wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <EditExceptionFlyout
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
      const callProps = (getExceptionBuilderComponentLazy as jest.Mock).mock.calls[0][0];
      await waitFor(() => {
        callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] });
      });
    });
    it('has the edit exception button enabled', () => {
      expect(
        wrapper.find('button[data-test-subj="edit-exception-confirm-button"]').getDOMNode()
      ).not.toBeDisabled();
    });
    it('renders the exceptions builder', () => {
      expect(wrapper.find('[data-test-subj="edit-exception-builder"]').exists()).toBeTruthy();
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
    it('should display the eql sequence callout', () => {
      expect(wrapper.find('[data-test-subj="eql-sequence-callout"]').exists()).toBeTruthy();
    });
  });

  xdescribe('when a detection exception with entries is passed', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <EditExceptionFlyout
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
      const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
      await waitFor(() => {
        callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] });
      });
    });
    it('has the edit exception button enabled', () => {
      expect(
        wrapper.find('button[data-test-subj="edit-exception-confirm-button"]').getDOMNode()
      ).not.toBeDisabled();
    });
    it('renders the exceptions builder', () => {
      expect(wrapper.find('[data-test-subj="edit-exception-builder"]').exists()).toBeTruthy();
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
    it('should not display the eql sequence callout', () => {
      expect(wrapper.find('[data-test-subj="eql-sequence-callout"]').exists()).not.toBeTruthy();
    });
  });

  xdescribe('when an exception with no entries is passed', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      const exceptionItemMock = { ...getExceptionListItemSchemaMock(), entries: [] };
      wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <EditExceptionFlyout
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
      const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
      await waitFor(() => {
        callProps.onChange({ exceptionItems: [...callProps.exceptionListItems] });
      });
    });
    it('has the edit exception button disabled', () => {
      expect(
        wrapper.find('button[data-test-subj="edit-exception-confirm-button"]').getDOMNode()
      ).toBeDisabled();
    });
    it('renders the exceptions builder', () => {
      expect(wrapper.find('[data-test-subj="edit-exception-builder"]').exists()).toBeTruthy();
    });
    it('should have the bulk close checkbox disabled', () => {
      expect(
        wrapper
          .find('input[data-test-subj="close-alert-on-add-edit-exception-checkbox"]')
          .getDOMNode()
      ).toBeDisabled();
    });
  });

  xtest('when there are exception builder errors has the add exception button disabled', async () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <EditExceptionFlyout
          ruleId="123"
          ruleIndices={['filebeat-*']}
          ruleName={ruleName}
          exceptionListType={'endpoint'}
          exceptionItem={{ ...getExceptionListItemSchemaMock(), entries: [] }}
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />
      </ThemeProvider>
    );
    const callProps = mockGetExceptionBuilderComponentLazy.mock.calls[0][0];
    await waitFor(() => callProps.onChange({ exceptionItems: [], errorExists: true }));

    expect(
      wrapper.find('button[data-test-subj="edit-exception-confirm-button"]').getDOMNode()
    ).toBeDisabled();
  });
});
