/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { GlobalFlyout } from '../../../../../../../../../../src/plugins/es_ui_shared/public';
import { uiSettingsServiceMock } from '../../../../../../../../../../src/core/public/mocks';
import { MappingsEditorProvider } from '../../../mappings_editor_context';
import { createKibanaReactContext } from '../../../shared_imports';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockComboBox'}
        data-currentvalue={props.selectedOptions}
        onChange={async (syntheticEvent: any) => {
          props.onChange([syntheticEvent['0']]);
        }}
      />
    ),
    // Mocking EuiCodeEditor, which uses React Ace under the hood
    EuiCodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.jsonContent);
        }}
      />
    ),
    // Mocking EuiSuperSelect to be able to easily change its value
    // with a `myWrapper.simulate('change', { target: { value: 'someValue' } })`
    EuiSuperSelect: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockSuperSelect'}
        value={props.valueOfSelected}
        onChange={(e) => {
          props.onChange(e.target.value);
        }}
      />
    ),
  };
});

jest.mock('../../../../../../../../../../src/plugins/kibana_react/public', () => {
  const original = jest.requireActual(
    '../../../../../../../../../../src/plugins/kibana_react/public'
  );

  const CodeEditorMock = (props: any) => (
    <input
      data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
      data-value={props.value}
      value={props.value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        props.onChange(e.target.value);
      }}
    />
  );

  return {
    ...original,
    CodeEditor: CodeEditorMock,
  };
});

const { GlobalFlyoutProvider } = GlobalFlyout;

const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
  uiSettings: uiSettingsServiceMock.createSetupContract(),
});

const defaultProps = {
  docLinks: {
    DOC_LINK_VERSION: 'master',
    ELASTIC_WEBSITE_URL: 'https://jest.elastic.co',
  },
};

export const WithAppDependencies = (Comp: any) => (props: any) => (
  <KibanaReactContextProvider>
    <MappingsEditorProvider>
      <GlobalFlyoutProvider>
        <Comp {...defaultProps} {...props} />
      </GlobalFlyoutProvider>
    </MappingsEditorProvider>
  </KibanaReactContextProvider>
);
