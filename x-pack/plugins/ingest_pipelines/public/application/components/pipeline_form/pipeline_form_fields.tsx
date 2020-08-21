/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiSwitch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { Processor } from '../../../../common/types';

import { getUseField, getFormRow, Field } from '../../../shared_imports';

import {
  ProcessorsEditorContextProvider,
  GlobalOnFailureProcessorsEditor,
  ProcessorsEditor,
  OnUpdateHandler,
  OnDoneLoadJsonHandler,
} from '../pipeline_processors_editor';

import { ProcessorsHeader } from './processors_header';
import { OnFailureProcessorsTitle } from './on_failure_processors_title';

interface Props {
  processors: Processor[];
  onFailure?: Processor[];
  onLoadJson: OnDoneLoadJsonHandler;
  onProcessorsUpdate: OnUpdateHandler;
  hasVersion: boolean;
  onEditorFlyoutOpen: () => void;
  isEditing?: boolean;
}

const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });

export const PipelineFormFields: React.FunctionComponent<Props> = ({
  processors,
  onFailure,
  onLoadJson,
  onProcessorsUpdate,
  isEditing,
  hasVersion,
  onEditorFlyoutOpen,
}) => {
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

      <ProcessorsEditorContextProvider
        onFlyoutOpen={onEditorFlyoutOpen}
        onUpdate={onProcessorsUpdate}
        value={{ processors, onFailure }}
      >
        <div className="pipelineProcessorsEditor">
          <EuiFlexGroup gutterSize="m" responsive={false} direction="column">
            <EuiFlexItem grow={false}>
              <ProcessorsHeader onLoadJson={onLoadJson} />
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="pipelineProcessorsEditor__container">
              <ProcessorsEditor />

              <EuiSpacer size="s" />

              <OnFailureProcessorsTitle />

              <GlobalOnFailureProcessorsEditor />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </ProcessorsEditorContextProvider>
    </>
  );
};
