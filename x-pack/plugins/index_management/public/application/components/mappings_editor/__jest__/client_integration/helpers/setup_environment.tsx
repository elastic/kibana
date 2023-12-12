/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, MemoExoticComponent } from 'react';
import SemVer from 'semver/classes/semver';

import { GlobalFlyout } from '@kbn/es-ui-shared-plugin/public';
import { docLinksServiceMock, uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { MAJOR_VERSION } from '../../../../../../../common';
import { MappingsEditorProvider } from '../../../mappings_editor_context';
import { createKibanaReactContext } from '../../../shared_imports';
import { Props as MappingsEditorProps } from '../../../mappings_editor';

export const kibanaVersion = new SemVer(MAJOR_VERSION);

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

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');

  const CodeEditorMock = (props: any) => (
    <input
      data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
      data-currentvalue={props.value}
      value={props.value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        props.onChange(e.currentTarget.getAttribute('data-currentvalue'));
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
  kibanaVersion: {
    get: () => kibanaVersion,
  },
});

const defaultProps: MappingsEditorProps = {
  docLinks: docLinksServiceMock.createStartContract(),
  onChange: () => undefined,
  esNodesPlugins: [],
};

export const WithAppDependencies =
  (Comp: MemoExoticComponent<ComponentType<MappingsEditorProps>>) =>
  (props: Partial<MappingsEditorProps>) =>
    (
      <KibanaReactContextProvider>
        <MappingsEditorProvider>
          <GlobalFlyoutProvider>
            <Comp {...defaultProps} {...props} />
          </GlobalFlyoutProvider>
        </MappingsEditorProvider>
      </KibanaReactContextProvider>
    );
