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
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
  EuiFormRow,
  EuiCopy,
} from '@elastic/eui';
import { XJsonLang } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { CodeEditorField } from '../../../../../../../src/plugins/kibana_react/public';

interface Props {
  processors: object[];
  onDownload(): void;
  onClickToCreatePipeline(): void;
  onUpdateProcessors(processors: object[]): void;
  isCreatingPipeline: boolean;
}

export const PreviewPanel: FC<Props> = ({
  processors,
  onDownload,
  onClickToCreatePipeline,
  onUpdateProcessors,
  isCreatingPipeline,
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
        <EuiTitle>
          <h2>Mapping</h2>
        </EuiTitle>

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

        <EuiSpacer size="xl" />

        {!isCreatingPipeline && (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCopy textToCopy={processorsJson}>
                {(copy: () => void) => (
                  <EuiCard
                    icon={<EuiIcon size="xxl" type={`copy`} />}
                    data-test-subj="copyPipelineProcessors"
                    title={
                      <FormattedMessage
                        id="xpack.ecsMapper.preview.copy"
                        defaultMessage="Copy to clipboard"
                      />
                    }
                    onClick={copy}
                    description=""
                  />
                )}
              </EuiCopy>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiCard
                icon={<EuiIcon size="xxl" type={`download`} />}
                data-test-subj="downloadPipelineProcessors"
                title={
                  <FormattedMessage
                    id="xpack.ecsMapper.preview.download"
                    defaultMessage="Download"
                  />
                }
                description=""
                onClick={onDownload}
              />
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiCard
                icon={<EuiIcon size="xxl" type={`gear`} />}
                data-test-subj="createIngestNodePipeline"
                title={
                  <FormattedMessage
                    id="xpack.ecsMapper.preview.createPipeline"
                    defaultMessage="Create Ingest Node pipeline"
                  />
                }
                description=""
                onClick={onClickToCreatePipeline}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
