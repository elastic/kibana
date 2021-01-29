/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount, ReactWrapper } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { waitFor } from '@testing-library/react';

import { AddExceptionModal } from './';
import { useCurrentUser } from '../../../../common/lib/kibana';
import { useAsync } from '../../../../shared_imports';
import { getExceptionListSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_schema.mock';
import { useFetchIndex } from '../../../containers/source';
import { stubIndexPattern } from 'src/plugins/data/common/index_patterns/index_pattern.stub';
import { useAddOrUpdateException } from '../use_add_exception';
import { useFetchOrCreateRuleExceptionList } from '../use_fetch_or_create_rule_exception_list';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { Ecs } from '../../../../../common/ecs';
import * as builder from '../builder';
import * as helpers from '../helpers';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { EntriesArray } from '../../../../../../lists/common/schemas/types';
import { ExceptionListItemSchema } from '../../../../../../lists/common';
import {
  getRulesEqlSchemaMock,
  getRulesSchemaMock,
} from '../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { useRuleAsync } from '../../../../detections/containers/detection_engine/rules/use_rule_async';

jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../containers/source');
jest.mock('../../../../detections/containers/detection_engine/rules');
jest.mock('../use_add_exception');
jest.mock('../use_fetch_or_create_rule_exception_list');
jest.mock('../builder');
jest.mock('../../../../shared_imports');
jest.mock('../../../../detections/containers/detection_engine/rules/use_rule_async');

describe('When the add exception modal is opened', () => {
  const ruleName = 'test rule';
  let defaultEndpointItems: jest.SpyInstance<
    ReturnType<typeof helpers.defaultEndpointExceptionItems>
  >;
  let ExceptionBuilderComponent: jest.SpyInstance<
    ReturnType<typeof builder.ExceptionBuilderComponent>
  >;
  beforeEach(() => {
    defaultEndpointItems = jest.spyOn(helpers, 'defaultEndpointExceptionItems');
    ExceptionBuilderComponent = jest
      .spyOn(builder, 'ExceptionBuilderComponent')
      .mockReturnValue(<></>);

    (useAsync as jest.Mock).mockImplementation(() => ({
      start: jest.fn(),
      loading: false,
    }));

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
    (useFetchIndex as jest.Mock).mockImplementation(() => [
      false,
      {
        indexPatterns: stubIndexPattern,
      },
    ]);
    (useCurrentUser as jest.Mock).mockReturnValue({ username: 'test-username' });
    (useRuleAsync as jest.Mock).mockImplementation(() => ({
      rule: getRulesSchemaMock(),
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
      (useFetchIndex as jest.Mock).mockImplementation(() => [
        true,
        {
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
    beforeEach(async () => {
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
  });

  describe('when there is alert data passed to an endpoint list exception', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      const alertDataMock: Ecs = { _id: 'test-id', file: { path: ['test/path'] } };

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
  });

  describe('when there is alert data passed to a detection list exception', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
      const alertDataMock: Ecs = { _id: 'test-id', file: { path: ['test/path'] } };

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
      const alertDataMock: Ecs = { _id: 'test-id', file: { path: ['test/path'] } };
      (useRuleAsync as jest.Mock).mockImplementation(() => ({
        rule: {
          ...getRulesEqlSchemaMock(),
          query:
            'sequence [process where process.name = "test.exe"] [process where process.name = "explorer.exe"]',
        },
      }));
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
    let callProps: {
      onChange: (props: { exceptionItems: ExceptionListItemSchema[] }) => void;
      exceptionListItems: ExceptionListItemSchema[];
    };
    beforeEach(async () => {
      // Mocks the index patterns to contain the pre-populated endpoint fields so that the exception qualifies as bulk closable
      (useFetchIndex as jest.Mock).mockImplementation(() => [
        false,
        {
          indexPatterns: {
            ...stubIndexPattern,
            fields: [
              { name: 'file.path.caseless', type: 'string' },
              { name: 'subject_name', type: 'string' },
              { name: 'trusted', type: 'string' },
              { name: 'file.hash.sha256', type: 'string' },
              { name: 'event.code', type: 'string' },
            ],
          },
        },
      ]);
      const alertDataMock: Ecs = { _id: 'test-id', file: { path: ['test/path'] } };
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
    await waitFor(() => callProps.onChange({ exceptionItems: [], errorExists: true }));
    expect(
      wrapper.find('button[data-test-subj="add-exception-confirm-button"]').getDOMNode()
    ).toBeDisabled();
  });
});
