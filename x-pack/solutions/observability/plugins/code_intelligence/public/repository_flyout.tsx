/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

import {
  DEFAULT_REPOSITORY_REF,
  MAX_REMOTE_URL_LENGTH,
  MAX_REPOSITORY_IDENTITY_LENGTH,
  MAX_REVISION_LENGTH,
  validateRepositorySettings,
  type RepositorySettingsField,
  type RepositorySettingsInput,
} from '../common/repository_settings';
import type { Repository } from './api';
import { saveRepository } from './api';

interface Props {
  http: HttpSetup;
  /** The repository being edited; absent when adding one. */
  editing?: Repository;
  onSaved: (repository: Repository) => void;
  onClose: () => void;
}

const fieldErrors: Record<RepositorySettingsField, string> = {
  repository: i18n.translate('xpack.codeIntelligence.repositoryForm.repositoryInvalid', {
    defaultMessage:
      'Use the form owner/name with only letters, digits, periods, underscores, or hyphens.',
  }),
  remoteUrl: i18n.translate('xpack.codeIntelligence.repositoryForm.remoteUrlInvalid', {
    defaultMessage: 'Use an https:// URL without a user name, password, query, or fragment.',
  }),
  defaultRef: i18n.translate('xpack.codeIntelligence.repositoryForm.defaultRefInvalid', {
    defaultMessage: 'Use HEAD, a branch, a tag, or a commit SHA.',
  }),
  githubConnectorId: i18n.translate(
    'xpack.codeIntelligence.repositoryForm.githubConnectorIdInvalid',
    { defaultMessage: 'The stored GitHub connector ID is invalid.' }
  ),
};

/** Reads field problems from a rejected save without trusting the response shape. */
const serverProblems = (error: unknown): RepositorySettingsField[] => {
  const problems = (error as { body?: { attributes?: { problems?: unknown } } })?.body?.attributes
    ?.problems;
  if (!Array.isArray(problems)) return [];
  return problems.flatMap((problem) =>
    typeof problem?.field === 'string' && problem.field in fieldErrors
      ? [problem.field as RepositorySettingsField]
      : []
  );
};

const serverMessage = (error: unknown): string | undefined => {
  const message = (error as { body?: { message?: unknown } })?.body?.message;
  return typeof message === 'string' && message.trim().length > 0 ? message : undefined;
};

export const RepositoryFlyout = ({ http, editing, onSaved, onClose }: Props) => {
  const [repository, setRepository] = useState(editing?.repository ?? '');
  const [remoteUrl, setRemoteUrl] = useState(editing?.remoteUrl ?? '');
  const [defaultRef, setDefaultRef] = useState(editing?.defaultRef ?? DEFAULT_REPOSITORY_REF);
  const [enabled, setEnabled] = useState(editing?.enabled ?? true);
  const [invalid, setInvalid] = useState<RepositorySettingsField[]>([]);
  const [saveError, setSaveError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const titleId = useGeneratedHtmlId({ prefix: 'codeIntelligenceRepositoryFlyoutTitle' });
  const formId = useGeneratedHtmlId({ prefix: 'codeIntelligenceRepositoryForm' });

  const submit = async () => {
    const input: RepositorySettingsInput = {
      repository: repository.trim(),
      remoteUrl: remoteUrl.trim(),
      defaultRef: defaultRef.trim() || DEFAULT_REPOSITORY_REF,
      enabled,
      // The form does not edit the connector, so saving must not drop it.
      ...(editing?.githubConnectorId === undefined
        ? {}
        : { githubConnectorId: editing.githubConnectorId }),
    };
    const problems = validateRepositorySettings(input).map(({ field }) => field);
    setInvalid(problems);
    setSaveError(undefined);
    if (problems.length > 0) return;
    setSaving(true);
    try {
      onSaved(await saveRepository(http, input));
    } catch (error) {
      const fields = serverProblems(error);
      setInvalid(fields);
      if (fields.length === 0) {
        setSaveError(
          serverMessage(error) ??
            i18n.translate('xpack.codeIntelligence.repositoryForm.saveFailed', {
              defaultMessage: 'The repository could not be saved.',
            })
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const rowError = (field: RepositorySettingsField) =>
    invalid.includes(field) ? fieldErrors[field] : undefined;

  return (
    <EuiFlyout
      ownFocus
      size="m"
      aria-labelledby={titleId}
      onClose={onClose}
      data-test-subj="codeIntelligenceRepositoryFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {editing === undefined
              ? i18n.translate('xpack.codeIntelligence.repositoryForm.addTitle', {
                  defaultMessage: 'Add repository',
                })
              : i18n.translate('xpack.codeIntelligence.repositoryForm.editTitle', {
                  defaultMessage: 'Edit {repository}',
                  values: { repository: editing.repository },
                })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {saveError !== undefined && (
          <>
            <EuiCallOut
              announceOnMount
              color="danger"
              iconType="error"
              size="s"
              data-test-subj="codeIntelligenceRepositorySaveError"
              title={saveError}
            />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiForm
          id={formId}
          component="form"
          // `isInvalid` sets a native validity message that would otherwise block the corrected submit.
          noValidate
          data-test-subj="codeIntelligenceRepositoryForm"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.codeIntelligence.repositoryForm.repositoryLabel', {
              defaultMessage: 'Repository',
            })}
            helpText={i18n.translate('xpack.codeIntelligence.repositoryForm.repositoryHelp', {
              defaultMessage: 'owner/name, for example elastic/kibana',
            })}
            isInvalid={rowError('repository') !== undefined}
            error={rowError('repository')}
          >
            <EuiFieldText
              fullWidth
              data-test-subj="codeIntelligenceRepositoryFormRepository"
              value={repository}
              disabled={editing !== undefined}
              maxLength={MAX_REPOSITORY_IDENTITY_LENGTH}
              isInvalid={rowError('repository') !== undefined}
              onChange={(event) => setRepository(event.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.codeIntelligence.repositoryForm.remoteUrlLabel', {
              defaultMessage: 'Remote URL',
            })}
            helpText={i18n.translate('xpack.codeIntelligence.repositoryForm.remoteUrlHelp', {
              defaultMessage: 'https://github.com/owner/name.git',
            })}
            isInvalid={rowError('remoteUrl') !== undefined}
            error={rowError('remoteUrl')}
          >
            <EuiFieldText
              fullWidth
              data-test-subj="codeIntelligenceRepositoryFormRemoteUrl"
              value={remoteUrl}
              maxLength={MAX_REMOTE_URL_LENGTH}
              isInvalid={rowError('remoteUrl') !== undefined}
              onChange={(event) => setRemoteUrl(event.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.codeIntelligence.repositoryForm.defaultRefLabel', {
              defaultMessage: 'Default ref',
            })}
            helpText={i18n.translate('xpack.codeIntelligence.repositoryForm.defaultRefHelp', {
              defaultMessage: 'HEAD means the remote default branch.',
            })}
            isInvalid={rowError('defaultRef') !== undefined}
            error={rowError('defaultRef')}
          >
            <EuiFieldText
              fullWidth
              data-test-subj="codeIntelligenceRepositoryFormDefaultRef"
              value={defaultRef}
              maxLength={MAX_REVISION_LENGTH}
              isInvalid={rowError('defaultRef') !== undefined}
              onChange={(event) => setDefaultRef(event.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow fullWidth>
            <EuiSwitch
              data-test-subj="codeIntelligenceRepositoryFormEnabled"
              label={i18n.translate('xpack.codeIntelligence.repositoryForm.enabledLabel', {
                defaultMessage: 'Enabled',
              })}
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="codeIntelligenceRepositoryFormCancel"
              flush="left"
              onClick={onClose}
            >
              {i18n.translate('xpack.codeIntelligence.repositoryForm.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="codeIntelligenceRepositoryFormSave"
              type="submit"
              form={formId}
              fill
              isLoading={saving}
            >
              {i18n.translate('xpack.codeIntelligence.repositoryForm.save', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
