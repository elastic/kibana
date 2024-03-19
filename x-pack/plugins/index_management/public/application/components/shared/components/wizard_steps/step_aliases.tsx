/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  EuiCode,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor } from '@kbn/code-editor';

import { Forms } from '../../../../../shared_imports';
import { useJsonStep } from './use_json_step';
import { documentationService } from '../../../mappings_editor/shared_imports';

interface Props {
  defaultValue?: { [key: string]: any };
  onChange: (content: Forms.Content) => void;
  esDocsBase: string;
}

export const StepAliases: React.FunctionComponent<Props> = React.memo(
  ({ defaultValue = {}, onChange, esDocsBase }) => {
    const { jsonContent, setJsonContent, error } = useJsonStep({
      defaultValue,
      onChange,
    });

    return (
      <div data-test-subj="stepAliases">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2 data-test-subj="stepTitle">
                <FormattedMessage
                  id="xpack.idxMgmt.formWizard.stepAliases.stepTitle"
                  defaultMessage="Aliases (optional)"
                />
              </h2>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.formWizard.stepAliases.aliasesDescription"
                  defaultMessage="Set up aliases to associate with your indices."
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={documentationService.getBulkIndexAlias()}
              target="_blank"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.idxMgmt.formWizard.stepAliases.docsButtonLabel"
                defaultMessage="Index Aliases docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        {/* Aliases code editor */}
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.idxMgmt.formWizard.stepAliases.fieldAliasesLabel"
              defaultMessage="Aliases"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.idxMgmt.formWizard.stepAliases.aliasesEditorHelpText"
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
          <CodeEditor
            languageId="json"
            value={jsonContent}
            data-test-subj="aliasesEditor"
            height={500}
            options={{
              lineNumbers: 'off',
              tabSize: 2,
              automaticLayout: true,
            }}
            aria-label={i18n.translate(
              'xpack.idxMgmt.formWizard.stepAliases.fieldAliasesAriaLabel',
              {
                defaultMessage: 'Aliases code editor',
              }
            )}
            onChange={setJsonContent}
          />
        </EuiFormRow>
      </div>
    );
  }
);
