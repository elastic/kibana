/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiSwitch } from '@elastic/eui';

import { Processor } from '../../../../common/types';
import { FormDataProvider } from '../../../shared_imports';
import { PipelineProcessorsEditor, OnUpdateHandler } from '../pipeline_processors_editor';

import { getUseField, getFormRow, Field, useKibana } from '../../../shared_imports';

interface Props {
  initialProcessors: Processor[];
  initialOnFailureProcessors?: Processor[];
  onProcessorsUpdate: OnUpdateHandler;
  hasVersion: boolean;
  isTestButtonDisabled: boolean;
  onTestPipelineClick: () => void;
  onEditorFlyoutOpen: () => void;
  isEditing?: boolean;
}

const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });

export const PipelineFormFields: React.FunctionComponent<Props> = ({
  initialProcessors,
  initialOnFailureProcessors,
  onProcessorsUpdate,
  isEditing,
  hasVersion,
  isTestButtonDisabled,
  onTestPipelineClick,
  onEditorFlyoutOpen,
}) => {
  const { services } = useKibana();

  const [isVersionVisible, setIsVersionVisible] = useState<boolean>(hasVersion);

  return (
    <>
      {/* Name field with optional version field */}
      <FormRow
        title={<FormattedMessage id="xpack.ingestPipelines.form.nameTitle" defaultMessage="Name" />}
        description={
          <>
            <FormattedMessage
              id="xpack.ingestPipelines.form.nameDescription"
              defaultMessage="A unique identifier for this pipeline."
            />
            <EuiSpacer size="m" />
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.ingestPipelines.form.versionToggleDescription"
                  defaultMessage="Add version number"
                />
              }
              checked={isVersionVisible}
              onChange={(e) => setIsVersionVisible(e.target.checked)}
              data-test-subj="versionToggle"
            />
          </>
        }
      >
        <UseField
          path="name"
          componentProps={{
            ['data-test-subj']: 'nameField',
            euiFieldProps: { disabled: Boolean(isEditing) },
          }}
        />

        {isVersionVisible && (
          <UseField
            path="version"
            componentProps={{
              ['data-test-subj']: 'versionField',
            }}
          />
        )}
      </FormRow>

      {/* Description field */}
      <FormRow
        title={
          <FormattedMessage
            id="xpack.ingestPipelines.form.descriptionFieldTitle"
            defaultMessage="Description"
          />
        }
        description={
          <FormattedMessage
            id="xpack.ingestPipelines.form.descriptionFieldDescription"
            defaultMessage="A description of what this pipeline does."
          />
        }
      >
        <UseField
          path="description"
          componentProps={{
            ['data-test-subj']: 'descriptionField',
            euiFieldProps: {
              compressed: true,
            },
          }}
        />
      </FormRow>

      {/* Pipeline Processors Editor */}
      <FormDataProvider pathsToWatch={['processors', 'on_failure']}>
        {({ processors, on_failure: onFailure }) => {
          const processorProp =
            typeof processors === 'string' && processors
              ? JSON.parse(processors)
              : initialProcessors ?? [];

          const onFailureProp =
            typeof onFailure === 'string' && onFailure
              ? JSON.parse(onFailure)
              : initialOnFailureProcessors ?? [];

          return (
            <PipelineProcessorsEditor
              onFlyoutOpen={onEditorFlyoutOpen}
              esDocsBasePath={services.documentation.getEsDocsBasePath()}
              isTestButtonDisabled={isTestButtonDisabled}
              onTestPipelineClick={onTestPipelineClick}
              onUpdate={onProcessorsUpdate}
              value={{ processors: processorProp, onFailure: onFailureProp }}
            />
          );
        }}
      </FormDataProvider>
    </>
  );
};
