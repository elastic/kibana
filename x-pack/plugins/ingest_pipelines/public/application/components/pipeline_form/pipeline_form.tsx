/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSwitch,
  EuiLink,
} from '@elastic/eui';

import {
  useForm,
  Form,
  getUseField,
  getFormRow,
  Field,
  FormConfig,
  JsonEditorField,
  useKibana,
  FormDataProvider,
} from '../../../shared_imports';
import { Pipeline } from '../../../../common/types';

import { SectionError, PipelineRequestFlyout } from '../';
import { pipelineFormSchema } from './schema';
import {
  PipelineProcessorsEditor,
  OnUpdateHandlerArg,
  OnUpdateHandler,
} from '../pipeline_processors_editor';

interface Props {
  onSave: (pipeline: Pipeline) => void;
  onCancel: () => void;
  isSaving: boolean;
  saveError: any;
  defaultValue?: Pipeline;
  isEditing?: boolean;
}

const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });

export const PipelineForm: React.FunctionComponent<Props> = ({
  defaultValue = {
    name: '',
    description: '',
    processors: '',
    on_failure: '',
    version: '',
  },
  onSave,
  isSaving,
  saveError,
  isEditing,
  onCancel,
}) => {
  const { services } = useKibana();

  const [processorsEditorState, setProcessorsEditorState] = useState<
    OnUpdateHandlerArg | undefined
  >();
  const [showJsonProcessorsEditor, setShowJsonProcessorsEditor] = useState(false);
  const [isVersionVisible, setIsVersionVisible] = useState<boolean>(Boolean(defaultValue.version));
  const [isOnFailureEditorVisible, setIsOnFailureEditorVisible] = useState<boolean>(
    Boolean(defaultValue.on_failure)
  );
  const [isRequestVisible, setIsRequestVisible] = useState<boolean>(false);

  const onPipelineProcessorsEditorUpdate = useCallback<OnUpdateHandler>(
    arg => {
      setProcessorsEditorState(arg);
    },
    [setProcessorsEditorState]
  );

  const handleSave: FormConfig['onSubmit'] = (formData, isValid) => {
    if (isValid) {
      // TODO: The JSON processor editor should be removed entirely which will simplify this handler
      if (!showJsonProcessorsEditor && processorsEditorState) {
        if (processorsEditorState.isValid === undefined) {
          (async () => {
            const valid = await processorsEditorState.validate();
            if (valid) {
              onSave({ ...formData, processors } as Pipeline);
            }
          })();
          return;
        }

        if (!processorsEditorState.isValid) {
          return;
        }

        const { processors } = processorsEditorState!.getData();
        onSave({ ...formData, processors } as Pipeline);
      } else {
        onSave(formData as Pipeline);
      }
    }
  };

  const { form } = useForm({
    schema: pipelineFormSchema,
    defaultValue,
    onSubmit: handleSave,
  });

  const renderProcessorsEditorSection = () => {
    if (showJsonProcessorsEditor) {
      return (
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
      );
    }

    return (
      <FormDataProvider pathsToWatch="processors">
        {({ processors }) => {
          const processorProp =
            typeof processors === 'string' && processors
              ? JSON.parse(processors)
              : defaultValue?.processors ?? [];

          return (
            <>
              <PipelineProcessorsEditor
                onUpdate={onPipelineProcessorsEditorUpdate}
                value={{ processors: processorProp }}
              />
              <EuiSpacer size="l" />
            </>
          );
        }}
      </FormDataProvider>
    );
  };

  const saveButtonLabel = isSaving ? (
    <FormattedMessage
      id="xpack.ingestPipelines.form.savingButtonLabel"
      defaultMessage="Saving..."
    />
  ) : isEditing ? (
    <FormattedMessage
      id="xpack.ingestPipelines.form.saveButtonLabel"
      defaultMessage="Save pipeline"
    />
  ) : (
    <FormattedMessage
      id="xpack.ingestPipelines.form.createButtonLabel"
      defaultMessage="Create pipeline"
    />
  );

  return (
    <>
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

        {/* TODO: Translate */}
        <EuiSwitch
          label="Show JSON editor"
          checked={showJsonProcessorsEditor}
          onChange={() => setShowJsonProcessorsEditor(prev => !prev)}
        />
        {renderProcessorsEditorSection()}

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

        {/* Request error */}
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

        {/* Form submission */}
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButton
                  fill
                  color="secondary"
                  iconType="check"
                  onClick={form.submit}
                  data-test-subj="submitButton"
                  disabled={form.isSubmitted && form.isValid === false}
                  isLoading={isSaving}
                >
                  {saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonEmpty color="primary" onClick={onCancel}>
                  <FormattedMessage
                    id="xpack.ingestPipelines.form.cancelButtonLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={() => setIsRequestVisible(prevIsRequestVisible => !prevIsRequestVisible)}
            >
              {isRequestVisible ? (
                <FormattedMessage
                  id="xpack.ingestPipelines.form.hideRequestButtonLabel"
                  defaultMessage="Hide request"
                />
              ) : (
                <FormattedMessage
                  id="xpack.ingestPipelines.form.showRequestButtonLabel"
                  defaultMessage="Show request"
                />
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        {isRequestVisible ? (
          <PipelineRequestFlyout
            closeFlyout={() => setIsRequestVisible(prevIsRequestVisible => !prevIsRequestVisible)}
          />
        ) : null}
      </Form>

      <EuiSpacer size="m" />
    </>
  );
};
