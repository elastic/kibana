/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { RuleEditorPanel } from '.';
import { VisualRuleEditor } from './visual_rule_editor';
import { JSONRuleEditor } from './json_rule_editor';
import { findTestSubject } from 'test_utils/find_test_subject';

// brace/ace uses the Worker class, which is not currently provided by JSDOM.
// This is not required for the tests to pass, but it rather suppresses lengthy
// warnings in the console which adds unnecessary noise to the test output.
import 'test_utils/stub_web_worker';
import { AllRule, FieldRule } from '../../model';
import { EuiErrorBoundary } from '@elastic/eui';
import { DocumentationLinksService } from '../../documentation_links';

import { coreMock } from '../../../../../../../../src/core/public/mocks';

describe('RuleEditorPanel', () => {
  it('renders the visual editor when no rules are defined', () => {
    const props = {
      rawRules: {},
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
      validateForm: false,
      docLinks: new DocumentationLinksService(coreMock.createStart().docLinks),
    };
    const wrapper = mountWithIntl(<RuleEditorPanel {...props} />);
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
      docLinks: new DocumentationLinksService(coreMock.createStart().docLinks),
    };
    const wrapper = mountWithIntl(<RuleEditorPanel {...props} />);
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
      docLinks: new DocumentationLinksService(coreMock.createStart().docLinks),
    };
    const wrapper = mountWithIntl(<RuleEditorPanel {...props} />);

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
      docLinks: new DocumentationLinksService(coreMock.createStart().docLinks),
    };
    const wrapper = mountWithIntl(<RuleEditorPanel {...props} />);

    wrapper.find(VisualRuleEditor).simulateError(new Error('Something awful happened here.'));

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(0);
    expect(wrapper.find(EuiErrorBoundary)).toHaveLength(1);
  });
});
