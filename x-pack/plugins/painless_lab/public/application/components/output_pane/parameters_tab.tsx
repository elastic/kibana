/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
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
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '../../../../../../../src/plugins/kibana_react/public';

interface Props {
  parameters: string;
  onParametersChange: (change: string) => void;
}

export function ParametersTab({ parameters, onParametersChange }: Props) {
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
                defaultMessage="Parameters"
              />{' '}
              <EuiIcon type="questionInCircle" color="subdued" />
            </span>
          </EuiToolTip>
        }
        fullWidth
        labelAppend={
          <EuiText size="xs">
            <EuiLink
              href="https://www.elastic.co/guide/en/elasticsearch/reference/master/modules-scripting-using.html#prefer-params"
              target="_blank"
            >
              {i18n.translate('xpack.painlessLab.parametersFieldDocLinkText', {
                defaultMessage: 'Parameters docs',
              })}
            </EuiLink>
          </EuiText>
        }
        helpText={i18n.translate('xpack.painlessLab.helpIconAriaLabel', {
          defaultMessage: 'Use JSON format',
        })}
      >
        <EuiPanel paddingSize="s">
          <CodeEditor
            languageId="json"
            height={600}
            value={parameters}
            onChange={onParametersChange}
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
          />
        </EuiPanel>
      </EuiFormRow>
    </>
  );
}
