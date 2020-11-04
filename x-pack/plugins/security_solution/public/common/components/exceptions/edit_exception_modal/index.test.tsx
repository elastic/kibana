/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { mount, ReactWrapper } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { EditExceptionModal } from './';
import { useCurrentUser } from '../../../../common/lib/kibana';
import { useFetchIndex } from '../../../containers/source';
import {
  stubIndexPattern,
  stubIndexPatternWithFields,
} from 'src/plugins/data/common/index_patterns/index_pattern.stub';
import { useAddOrUpdateException } from '../use_add_exception';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { EntriesArray } from '../../../../../../lists/common/schemas/types';
import * as builder from '../builder';
import {
  getRulesEqlSchemaMock,
  getRulesSchemaMock,
} from '../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { useRuleAsync } from '../../../../detections/containers/detection_engine/rules/use_rule_async';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../detections/containers/detection_engine/rules');
jest.mock('../use_add_exception');
jest.mock('../../../containers/source');
jest.mock('../use_fetch_or_create_rule_exception_list');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('../builder');
jest.mock('../../../../detections/containers/detection_engine/rules/use_rule_async');

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
    (useFetchIndex as jest.Mock).mockImplementation(() => [
      false,
      {
        indexPatterns: stubIndexPatternWithFields,
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
    it('renders the loading spinner', async () => {
      (useFetchIndex as jest.Mock).mockImplementation(() => [
        true,
        {
          indexPatterns: stubIndexPattern,
        },
      ]);
      const wrapper = mount(
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
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="loadingEditExceptionModal"]').exists()).toBeTruthy();
      });
    });
  });

  describe('when an endpoint exception with exception data is passed', () => {
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
      beforeEach(async () => {
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

  describe('when an exception assigned to a sequence eql rule type is passed', () => {
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
    it('should display the eql sequence callout', () => {
      expect(wrapper.find('[data-test-subj="eql-sequence-callout"]').exists()).toBeTruthy();
    });
  });

  describe('when a detection exception with entries is passed', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
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
    it('should not display the eql sequence callout', () => {
      expect(wrapper.find('[data-test-subj="eql-sequence-callout"]').exists()).not.toBeTruthy();
    });
  });

  describe('when an exception with no entries is passed', () => {
    let wrapper: ReactWrapper;
    beforeEach(async () => {
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

  test('when there are exception builder errors has the add exception button disabled', async () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <EditExceptionModal
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
    const callProps = ExceptionBuilderComponent.mock.calls[0][0];
    await waitFor(() => callProps.onChange({ exceptionItems: [], errorExists: true }));

    expect(
      wrapper.find('button[data-test-subj="edit-exception-confirm-button"]').getDOMNode()
    ).toBeDisabled();
  });
});
