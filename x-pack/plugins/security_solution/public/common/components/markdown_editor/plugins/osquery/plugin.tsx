/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiMarkdownEditorUiPluginEditorProps } from '@elastic/eui/src/components/markdown_editor/markdown_types';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useCallback, useMemo } from 'react';
import { isEmpty, pickBy } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { LabelField } from './label_field';
import { OsqueryNotAvailablePrompt } from './not_available_prompt';
import { useKibana } from '../../../../lib/kibana';

interface FormData {
  label: string;
  query: string;
  ecs_mapping: Record<string, unknown>;
}

const OsqueryEditorComponent = ({
  node,
  onSave,
  onCancel,
}: EuiMarkdownEditorUiPluginEditorProps<{
  configuration: {
    label?: string;
    query: string;
    ecs_mapping: { [key: string]: {} };
  };
}>) => {
  const isEditMode = node != null;
  const {
    osquery,
    application: {
      capabilities: { osquery: osqueryPermissions },
    },
  } = useKibana().services;
  const formMethods = useForm<FormData>({
    defaultValues: {
      label: node?.configuration?.label,
      query: node?.configuration?.query,
      ecs_mapping: node?.configuration?.ecs_mapping,
    },
  });

  const onSubmit = useCallback(
    (data: FormData) => {
      onSave(
        `!{osquery${JSON.stringify(
          pickBy(
            {
              query: data.query,
              label: data.label,
              ecs_mapping: data.ecs_mapping,
            },
            (value) => !isEmpty(value)
          )
        )}}`,
        {
          block: true,
        }
      );
    },
    [onSave]
  );

  const noOsqueryPermissions = useMemo(
    () =>
      (!osqueryPermissions.runSavedQueries || !osqueryPermissions.readSavedQueries) &&
      !osqueryPermissions.writeLiveQueries,
    [
      osqueryPermissions.readSavedQueries,
      osqueryPermissions.runSavedQueries,
      osqueryPermissions.writeLiveQueries,
    ]
  );

  const OsqueryActionForm = useMemo(() => {
    if (osquery?.LiveQueryField) {
      const { LiveQueryField } = osquery;

      return (
        <FormProvider {...formMethods}>
          <LabelField />
          <EuiSpacer size="m" />
          <LiveQueryField formMethods={formMethods} />
        </FormProvider>
      );
    }
    return null;
  }, [formMethods, osquery]);

  if (noOsqueryPermissions) {
    return <OsqueryNotAvailablePrompt />;
  }

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>
            {isEditMode ? (
              <FormattedMessage
                id="xpack.securitySolution.markdown.osquery.editModalTitle"
                defaultMessage="Edit query"
              />
            ) : (
              <FormattedMessage
                id="xpack.securitySolution.markdown.osquery.addModalTitle"
                defaultMessage="Add query"
              />
            )}
          </h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <>{OsqueryActionForm}</>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>
          {i18n.translate('xpack.securitySolution.markdown.osquery.modalCancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton onClick={formMethods.handleSubmit(onSubmit)} fill>
          {isEditMode ? (
            <FormattedMessage
              id="xpack.securitySolution.markdown.osquery.addModalConfirmButtonLabel"
              defaultMessage="Add query"
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.markdown.osquery.editModalConfirmButtonLabel"
              defaultMessage="Save changes"
            />
          )}
        </EuiButton>
      </EuiModalFooter>
    </>
  );
};

const OsqueryEditor = React.memo(OsqueryEditorComponent);

export const plugin = ({
  interactionsUpsellingMessage,
}: {
  interactionsUpsellingMessage: string | null;
}) => {
  return {
    name: 'osquery',
    button: {
      label: interactionsUpsellingMessage ?? 'Osquery',
      iconType: 'logoOsquery',
      isDisabled: !!interactionsUpsellingMessage,
    },
    helpText: (
      <div>
        <EuiCodeBlock language="md" fontSize="l" paddingSize="s" isCopyable>
          {'!{osquery{options}}'}
        </EuiCodeBlock>
        <EuiSpacer size="s" />
      </div>
    ),
    editor: OsqueryEditor,
  };
};
