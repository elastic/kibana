/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiCopy,
  EuiCallOut,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { XJsonLang } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { CodeEditorField } from '../../../../../../../src/plugins/kibana_react/public';

interface Props {
  processors: object[];
  onDownload(): void;
  onClickToCreatePipeline(): void;
  onUpdateProcessors(processors: object[]): void;
  hasError: boolean;
}

export const PipelinesPreview: FC<Props> = ({
  processors,
  onDownload,
  onClickToCreatePipeline,
  onUpdateProcessors,
  hasError
}) => {
  const [isValidJson, setIsValidJson] = useState<boolean>(true);
  const [processorsJson, setProcessorsJson] = useState<string>('');

  useEffect(() => {
    const jsonString = JSON.stringify(processors, null, 2);
    setProcessorsJson(jsonString);
  }, [processors]);

  const onUpdate = (updated: string) => {
    setProcessorsJson(updated);

    try {
      setIsValidJson(true);
      const parsedJson = JSON.parse(updated);
      onUpdateProcessors(parsedJson);
    } catch (e) {
      setIsValidJson(false);
    }
  };

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        {!hasError && (
          <EuiCallOut title="CSV processed successfully" color="success" iconType="check">
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.ecsMapper.preview.jsonMapSuccessful"
                  defaultMessage="Your CSV mappings have been processed as JSON which you may modify below."
                />
              </p>
            </EuiText>
          </EuiCallOut>
        )}

        <EuiSpacer size="m" />

        <EuiFormRow
          isInvalid={!isValidJson}
          error={
            !isValidJson
              ? i18n.translate('xpack.ecsMapper.preview.invalidJson', {
                  defaultMessage: 'Invalid JSON.',
                })
              : null
          }
          fullWidth
          data-test-subj="roleMappingsJSONEditor"
        >
          <Fragment>
            <CodeEditorField
              aria-label={''}
              languageId={XJsonLang.ID}
              value={processorsJson}
              onChange={(pipelineProcessors) => onUpdate(pipelineProcessors)}
              fullWidth={true}
              height="400px"
              options={{
                accessibilitySupport: 'off',
                lineNumbers: 'on',
                fontSize: 12,
                tabSize: 2,
                automaticLayout: true,
                minimap: { enabled: false },
                overviewRulerBorder: false,
                scrollbar: { alwaysConsumeMouseWheel: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                wrappingIndent: 'indent',
              }}
            />
          </Fragment>
        </EuiFormRow>

        <EuiSpacer size="m" />

        {
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={onClickToCreatePipeline}
              >
                <FormattedMessage
                  id="xpack.ecsMapper.preview.createPipeline"
                  defaultMessage="Continue to create ingest node pipeline"
                />
              </EuiButton>  
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={processorsJson}>
                {(copy: () => void) => (
                  <EuiButtonEmpty iconType="copy" size="s" onClick={copy}>
                    <FormattedMessage
                        id="xpack.ecsMapper.preview.copy"
                        defaultMessage="Copy JSON to clipboard"
                      />
                  </EuiButtonEmpty>
                )}
              </EuiCopy>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="download" size="s" onClick={onDownload}>
                <FormattedMessage
                    id="xpack.ecsMapper.preview.download"
                    defaultMessage="Download JSON"
                  />
              </EuiButtonEmpty>
            </EuiFlexItem>
            
          </EuiFlexGroup>
        }
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
