/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiSpacer, EuiSwitch, EuiLink } from '@elastic/eui';

import {
  getUseField,
  getFormRow,
  Field,
  JsonEditorField,
  useKibana,
} from '../../../shared_imports';

interface Props {
  hasVersion: boolean;
  hasOnFailure: boolean;
  isTestButtonDisabled: boolean;
  onTestPipelineClick: () => void;
  isEditing?: boolean;
}

const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });

export const PipelineFormFields: React.FunctionComponent<Props> = ({
  isEditing,
  hasVersion,
  hasOnFailure,
  isTestButtonDisabled,
  onTestPipelineClick,
}) => {
  const { services } = useKibana();

  const [isVersionVisible, setIsVersionVisible] = useState<boolean>(hasVersion);
  const [isOnFailureEditorVisible, setIsOnFailureEditorVisible] = useState<boolean>(hasOnFailure);

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
              onChange={e => setIsVersionVisible(e.target.checked)}
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
            defaultMessage="The description to apply to the pipeline."
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

      {/* Processors field */}
      <FormRow
        title={
          <FormattedMessage
            id="xpack.ingestPipelines.form.processorsFieldTitle"
            defaultMessage="Processors"
          />
        }
        description={
          <>
            <FormattedMessage
              id="xpack.ingestPipelines.form.processorsFieldDescription"
              defaultMessage="The processors used to pre-process documents before indexing. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink href={services.documentation.getProcessorsUrl()} target="_blank">
                    {i18n.translate('xpack.ingestPipelines.form.processorsDocumentionLink', {
                      defaultMessage: 'Learn more.',
                    })}
                  </EuiLink>
                ),
              }}
            />

            <EuiSpacer />

            <EuiButton size="s" onClick={onTestPipelineClick} disabled={isTestButtonDisabled}>
              <FormattedMessage
                id="xpack.ingestPipelines.form.testPipelineButtonLabel"
                defaultMessage="Test pipeline"
              />
            </EuiButton>
          </>
        }
      >
        <UseField
          path="processors"
          component={JsonEditorField}
          componentProps={{
            ['data-test-subj']: 'processorsField',
            euiCodeEditorProps: {
              height: '300px',
              'aria-label': i18n.translate('xpack.ingestPipelines.form.processorsFieldAriaLabel', {
                defaultMessage: 'Processors JSON editor',
              }),
            },
          }}
        />
      </FormRow>

      {/* On-failure field */}
      <FormRow
        title={
          <FormattedMessage
            id="xpack.ingestPipelines.form.onFailureTitle"
            defaultMessage="Failure processors"
          />
        }
        description={
          <>
            <FormattedMessage
              id="xpack.ingestPipelines.form.onFailureDescription"
              defaultMessage="The processors to be executed following a failed processor. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink href={services.documentation.getHandlingFailureUrl()} target="_blank">
                    {i18n.translate('xpack.ingestPipelines.form.onFailureDocumentionLink', {
                      defaultMessage: 'Learn more.',
                    })}
                  </EuiLink>
                ),
              }}
            />
            <EuiSpacer size="m" />
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.ingestPipelines.form.onFailureToggleDescription"
                  defaultMessage="Add on-failure processors"
                />
              }
              checked={isOnFailureEditorVisible}
              onChange={e => setIsOnFailureEditorVisible(e.target.checked)}
              data-test-subj="onFailureToggle"
            />
          </>
        }
      >
        {isOnFailureEditorVisible ? (
          <UseField
            path="on_failure"
            component={JsonEditorField}
            componentProps={{
              ['data-test-subj']: 'onFailureEditor',
              euiCodeEditorProps: {
                height: '300px',
                'aria-label': i18n.translate('xpack.ingestPipelines.form.onFailureFieldAriaLabel', {
                  defaultMessage: 'On-failure processors JSON editor',
                }),
              },
            }}
          />
        ) : (
          // <FormRow/> requires children or a field
          // For now, we return an empty <div> if the editor is not visible
          <div />
        )}
      </FormRow>
    </>
  );
};
