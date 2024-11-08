/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiCodeBlock,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';
import { useImportKnowledgeBaseEntries } from '../../hooks/use_import_knowledge_base_entries';
import { useKibana } from '../../hooks/use_kibana';

export function KnowledgeBaseBulkImportFlyout({ onClose }: { onClose: () => void }) {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const { mutateAsync, isLoading } = useImportKnowledgeBaseEntries();

  const filePickerId = useGeneratedHtmlId({ prefix: 'filePicker' });

  const [files, setFiles] = useState<File[]>([]);

  const onChange = (file: FileList | null) => {
    setFiles(file && file.length > 0 ? Array.from(file) : []);
  };

  const handleSubmitNewEntryClick = async () => {
    let entries: Array<Omit<KnowledgeBaseEntry, '@timestamp' | 'title'> & { title: string }> = [];
    const text = await files[0].text();

    const elements = text.split('\n').filter(Boolean);

    try {
      entries = elements.map((el) => JSON.parse(el));
    } catch (_) {
      toasts.addError(
        new Error(
          i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseBulkImportFlyout.errorParsingEntries.description',
            {
              defaultMessage: 'Error parsing JSON entries',
            }
          )
        ),
        {
          title: i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseBulkImportFlyout.errorParsingEntries.title',
            {
              defaultMessage: 'Something went wrong',
            }
          ),
        }
      );
    }

    mutateAsync({ entries }).then(onClose);
  };

  return (
    <EuiFlyout onClose={onClose} data-test-subj="knowledgeBaseBulkImportFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate(
              'xpack.observabilityAiAssistantManagement.knowledgeBaseBulkImportFlyout.h2.bulkImportLabel',
              { defaultMessage: 'Import files' }
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="addDataApp" size="xl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.knowledgeBaseBulkImportFlyout.addFilesToEnrichTitleLabel',
                  { defaultMessage: 'Add files to enrich your Knowledge base' }
                )}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiText size="s">
          <FormattedMessage
            id="xpack.observabilityAiAssistantManagement.knowledgeBaseBulkImportFlyout.uploadAJSONFileTextLabel"
            defaultMessage="Upload a newline delimited JSON ({ext}) file containing a list of entries to add to your Knowledge base."
            values={{
              ext: <EuiCode language="html">.ndjson</EuiCode>,
            }}
          />
        </EuiText>

        <EuiSpacer size="m" />

        <EuiText size="s">
          {i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseBulkImportFlyout.theObjectsShouldBeTextLabel',
            { defaultMessage: 'The objects should be of the following format:' }
          )}
        </EuiText>

        <EuiSpacer size="m" />

        <EuiCodeBlock isCopyable paddingSize="s">
          {`{
  "id": "a_unique_human_readable_id",
  "text": "Contents of item",
}
`}
        </EuiCodeBlock>

        <EuiHorizontalRule />

        <EuiFilePicker
          aria-label={i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseBulkImportFlyout.euiFilePicker.uploadJSONLabel',
            { defaultMessage: 'Upload JSON' }
          )}
          display="large"
          fullWidth
          id={filePickerId}
          initialPromptText={i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseBulkImportFlyout.euiFilePicker.selectOrDragAndLabel',
            { defaultMessage: 'Select or drag and drop a .ndjson file' }
          )}
          onChange={onChange}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="knowledgeBaseBulkImportFlyoutCancelButton"
              disabled={isLoading}
              onClick={onClose}
            >
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.knowledgeBaseBulkImportFlyout.cancelButtonEmptyLabel',
                { defaultMessage: 'Cancel' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="knowledgeBaseBulkImportFlyoutSaveButton"
              fill
              isLoading={isLoading}
              onClick={handleSubmitNewEntryClick}
            >
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.knowledgeBaseBulkImportFlyout.saveButtonLabel',
                { defaultMessage: 'Save' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
