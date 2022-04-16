/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// brace/ace uses the Worker class, which is not currently provided by JSDOM.
// This is not required for the tests to pass, but it rather suppresses lengthy
// warnings in the console which adds unnecessary noise to the test output.
import '@kbn/test-jest-helpers/target_node/stub_web_worker';

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';

import { AllRule, FieldRule } from '../../model';
import { JSONRuleEditor } from './json_rule_editor';
import { RuleEditorPanel } from './rule_editor_panel';
import { VisualRuleEditor } from './visual_rule_editor';

describe('RuleEditorPanel', () => {
  const renderView = (props: Omit<React.ComponentProps<typeof RuleEditorPanel>, 'docLinks'>) => {
    const coreStart = coreMock.createStart();
    const viewProps = { ...props, docLinks: coreStart.docLinks };
    return mountWithIntl(
      <KibanaContextProvider services={coreStart}>
        <RuleEditorPanel {...viewProps} />
      </KibanaContextProvider>
    );
  };
  it('renders the visual editor when no rules are defined', () => {
    const props = {
      rawRules: {},
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
      validateForm: false,
    };
    const wrapper = renderView(props);
    expect(wrapper.find(VisualRuleEditor)).toHaveLength(1);
    expect(wrapper.find(JSONRuleEditor)).toHaveLength(0);
  });

  it('allows switching to the JSON editor, carrying over rules', () => {
    const props = {
      rawRules: {
        all: [
          {
            field: {
              username: ['*'],
            },
          },
        ],
      },
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
      validateForm: false,
      docLinks: coreMock.createStart().docLinks,
    };
    const wrapper = renderView(props);
    expect(wrapper.find(VisualRuleEditor)).toHaveLength(1);
    expect(wrapper.find(JSONRuleEditor)).toHaveLength(0);

    findTestSubject(wrapper, 'roleMappingsJSONRuleEditorButton').simulate('click');

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(0);

    const jsonEditor = wrapper.find(JSONRuleEditor);
    expect(jsonEditor).toHaveLength(1);
    const { rules } = jsonEditor.props();
    expect(rules!.toRaw()).toEqual(props.rawRules);
  });

  it('allows switching to the visual editor, carrying over rules', () => {
    const props = {
      rawRules: {
        field: { username: '*' },
      },
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
      validateForm: false,
    };
    const wrapper = renderView(props);

    findTestSubject(wrapper, 'roleMappingsJSONRuleEditorButton').simulate('click');

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(0);
    expect(wrapper.find(JSONRuleEditor)).toHaveLength(1);

    const jsonEditor = wrapper.find(JSONRuleEditor);
    expect(jsonEditor).toHaveLength(1);
    const { rules: initialRules, onChange } = jsonEditor.props();
    expect(initialRules?.toRaw()).toEqual({
      field: { username: '*' },
    });

    onChange(new AllRule([new FieldRule('otherRule', 12)]));

    findTestSubject(wrapper, 'roleMappingsVisualRuleEditorButton').simulate('click');

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(1);
    expect(wrapper.find(JSONRuleEditor)).toHaveLength(0);

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [rules] = props.onChange.mock.calls[0];
    expect(rules).toEqual({
      all: [{ field: { otherRule: 12 } }],
    });
  });

  it('catches errors thrown by child components', () => {
    const props = {
      rawRules: {},
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
      validateForm: false,
    };
    const wrapper = renderView(props);

    wrapper.find(VisualRuleEditor).simulateError(new Error('Something awful happened here.'));

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(0);
    expect(wrapper.find(EuiErrorBoundary)).toHaveLength(1);
  });
});
