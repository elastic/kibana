/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiSwitch, EuiLink } from '@elastic/eui';

import {
  useForm,
  Form,
  getUseField,
  getFormRow,
  Field,
  FormConfig,
  JsonEditorField,
  useKibana,
} from '../../../shared_imports';
import { Pipeline } from '../../../../common/types';

import { SectionError } from '../section_error';
import { pipelineFormSchema } from './schema';

interface Props {
  onSave: (pipeline: Pipeline) => void;
  isSaving: boolean;
  saveError: any;
  defaultValue?: Pipeline;
}

const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });

export const PipelineForm: React.FunctionComponent<Props> = ({
  defaultValue = {
    name: '',
    description: '',
    processors: '',
    onFailure: '',
    version: '',
  },
  onSave,
  isSaving,
  saveError,
}) => {
  const { services } = useKibana();

  const [isVersionVisible, setIsVersionVisible] = useState<boolean>(false);
  const [isOnFailureEditorVisible, setIsOnFailureEditorVisible] = useState<boolean>(false);

  const handleSave: FormConfig['onSubmit'] = (formData, isValid) => {
    if (isValid) {
      onSave(formData as Pipeline);
    }
  };

  const { form } = useForm({
    schema: pipelineFormSchema,
    defaultValue,
    onSubmit: handleSave,
  });

  return (
    <>
      {saveError ? (
        <>
          <SectionError
            title={
              <FormattedMessage
                id="xpack.ingestPipelines.form.savePipelineError"
                defaultMessage="Unable to create pipeline"
              />
            }
            error={saveError}
            data-test-subj="savePipelineError"
          />
          <EuiSpacer size="m" />
        </>
      ) : null}

      <Form
        form={form}
        data-test-subj="pipelineForm"
        isInvalid={form.isSubmitted && !form.isValid}
        error={form.getErrors()}
      >
        {/* Name field with optional version field */}
        <FormRow
          title={
            <FormattedMessage id="xpack.ingestPipelines.form.nameTitle" defaultMessage="Name" />
          }
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

        {/* Description */}
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
          }
        >
          <UseField
            path="processors"
            component={JsonEditorField}
            componentProps={{
              ['data-test-subj']: 'processorsField',
              euiCodeEditorProps: {
                height: '300px',
                'aria-label': i18n.translate(
                  'xpack.ingestPipelines.form.processorsFieldAriaLabel',
                  {
                    defaultMessage: 'Processors JSON editor',
                  }
                ),
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
              path="onFailure"
              component={JsonEditorField}
              componentProps={{
                ['data-test-subj']: 'onFailureEditor',
                euiCodeEditorProps: {
                  height: '300px',
                  'aria-label': i18n.translate(
                    'xpack.ingestPipelines.form.onFailureFieldAriaLabel',
                    {
                      defaultMessage: 'On-failure processors JSON editor',
                    }
                  ),
                },
              }}
            />
          ) : (
            // <FormRow/> requires children or a field
            // For now, we return an empty <div> if the editor is not visible
            <div />
          )}
        </FormRow>

        <EuiSpacer size="l" />

        {/* Form submission */}
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="secondary"
                  iconType="check"
                  onClick={form.submit}
                  data-test-subj="submitButton"
                  disabled={form.isSubmitted && form.isValid === false}
                  isLoading={isSaving}
                >
                  {
                    <FormattedMessage
                      id="xpack.ingestPipelines.form.createButtonLabel"
                      defaultMessage="Create pipeline"
                    />
                  }
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Form>

      <EuiSpacer size="m" />
    </>
  );
};
