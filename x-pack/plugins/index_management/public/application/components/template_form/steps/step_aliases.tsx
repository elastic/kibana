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

export const StepAliases: React.FunctionComponent<StepProps> = ({
  template,
  setDataGetter,
  onStepValidityChange,
}) => {
  const { content, setContent, error } = useJsonStep({
    prop: 'aliases',
    defaultValue: template.aliases,
    setDataGetter,
    onStepValidityChange,
  });

  return (
    <div data-test-subj="stepAliases">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2 data-test-subj="stepTitle">
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepAliases.stepTitle"
                defaultMessage="Aliases (optional)"
              />
            </h2>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepAliases.aliasesDescription"
                defaultMessage="Set up aliases to associate with your indices."
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={documentationService.getTemplatesDocumentationLink()}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.idxMgmt.templateForm.stepAliases.docsButtonLabel"
              defaultMessage="Index Templates docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {/* Aliases code editor */}
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.idxMgmt.templateForm.stepAliases.fieldAliasesLabel"
            defaultMessage="Aliases"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.idxMgmt.templateForm.stepAliases.aliasesEditorHelpText"
            defaultMessage="Use JSON format: {code}"
            values={{
              code: (
                <EuiCode>
                  {JSON.stringify({
                    my_alias: {},
                  })}
                </EuiCode>
              ),
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
            'xpack.idxMgmt.templateForm.stepAliases.fieldAliasesAriaLabel',
            {
              defaultMessage: 'Aliases code editor',
            }
          )}
          value={content}
          onChange={(updated: string) => {
            setContent(updated);
          }}
          data-test-subj="aliasesEditor"
        />
      </EuiFormRow>
    </div>
  );
};
