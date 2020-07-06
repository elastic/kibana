/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import {
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiIcon,
  EuiToolTip,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { monaco } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '../../../../../../../src/plugins/kibana_react/public';

import { useAppContext } from '../../context';

export const ParametersTab: FunctionComponent = () => {
  const {
    store: { payload },
    updatePayload,
    links,
  } = useAppContext();
  return (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <EuiToolTip
            content={i18n.translate('xpack.painlessLab.parametersFieldTooltipText', {
              defaultMessage: 'These variables are assigned to the "params" object in your script',
            })}
          >
            <span>
              <FormattedMessage
                id="xpack.painlessLab.parametersFieldLabel"
                defaultMessage="Parameters (JSON)"
              />{' '}
              <EuiIcon type="questionInCircle" color="subdued" />
            </span>
          </EuiToolTip>
        }
        fullWidth
        labelAppend={
          <EuiText size="xs">
            <EuiLink href={links.modulesScriptingPreferParams} target="_blank">
              {i18n.translate('xpack.painlessLab.parametersFieldDocLinkText', {
                defaultMessage: 'Parameters docs',
              })}
            </EuiLink>
          </EuiText>
        }
      >
        <EuiPanel paddingSize="s">
          <CodeEditor
            languageId="json"
            height={600}
            value={payload.parameters}
            onChange={(nextParams) => updatePayload({ parameters: nextParams })}
            options={{
              fontSize: 12,
              minimap: {
                enabled: false,
              },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              wrappingIndent: 'indent',
              automaticLayout: true,
            }}
            editorDidMount={(editor: monaco.editor.IStandaloneCodeEditor) => {
              // Updating tab size for the editor
              const model = editor.getModel();
              if (model) {
                model.updateOptions({ tabSize: 2 });
              }
            }}
          />
        </EuiPanel>
      </EuiFormRow>
    </>
  );
};
