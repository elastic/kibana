/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiFormRow,
  EuiText,
  EuiCodeEditor,
  EuiCode,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { documentationService } from '../../../services/documentation';
import { StepProps } from '../types';
import { useJsonStep } from './use_json_step';

export const StepSettings: React.FunctionComponent<StepProps> = ({
  template,
  setDataGetter,
  onStepValidityChange,
}) => {
  const { content, setContent, error } = useJsonStep({
    prop: 'settings',
    defaultValue: template.settings,
    setDataGetter,
    onStepValidityChange,
  });

  return (
    <div data-test-subj="stepSettings">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2 data-test-subj="stepTitle">
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepSettings.stepTitle"
                defaultMessage="Index settings (optional)"
              />
            </h2>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepSettings.settingsDescription"
                defaultMessage="Define the behavior of your indices."
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={documentationService.getSettingsDocumentationLink()}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.idxMgmt.templateForm.stepSettings.docsButtonLabel"
              defaultMessage="Index settings docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {/* Settings code editor */}
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.idxMgmt.templateForm.stepSettings.fieldIndexSettingsLabel"
            defaultMessage="Index settings"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.idxMgmt.templateForm.stepSettings.settingsEditorHelpText"
            defaultMessage="Use JSON format: {code}"
            values={{
              code: <EuiCode>{JSON.stringify({ number_of_replicas: 1 })}</EuiCode>,
            }}
          />
        }
        isInvalid={Boolean(error)}
        error={error}
        fullWidth
      >
        <EuiCodeEditor
          mode="json"
          theme="textmate"
          width="100%"
          height="500px"
          setOptions={{
            showLineNumbers: false,
            tabSize: 2,
          }}
          editorProps={{
            $blockScrolling: Infinity,
          }}
          showGutter={false}
          minLines={6}
          aria-label={i18n.translate(
            'xpack.idxMgmt.templateForm.stepSettings.fieldIndexSettingsAriaLabel',
            {
              defaultMessage: 'Index settings editor',
            }
          )}
          value={content}
          onChange={(updated: string) => setContent(updated)}
          data-test-subj="settingsEditor"
        />
      </EuiFormRow>
    </div>
  );
};
