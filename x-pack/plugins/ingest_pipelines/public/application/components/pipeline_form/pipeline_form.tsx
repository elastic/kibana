/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import {
  useForm,
  Form,
  getUseField,
  getFormRow,
  Field,
  FormConfig,
  JsonEditorField,
} from '../../../shared_imports';
import { Pipeline } from '../../../../common/types';

import { pipelineFormSchema } from './schema';

interface Props {
  onSave: (pipeline: any) => void; // todo fix TS
  isSaving: boolean;
  saveError: any;
  defaultValue?: Pipeline;
}

const fieldsMeta = {
  name: {
    title: i18n.translate('xpack.ingestPipelines.form.nameTitle', {
      defaultMessage: 'Name',
    }),
    description: i18n.translate('xpack.ingestPipelines.form.nameDescription', {
      defaultMessage: 'A unique identifier for this pipeline.',
    }),
    testSubject: 'nameField',
  },
  description: {
    title: i18n.translate('xpack.ingestPipelines.form.descriptionFielditle', {
      defaultMessage: 'Description',
    }),
    description: i18n.translate('xpack.ingestPipelines.form.descriptionFieldDescription', {
      defaultMessage: 'The description to apply to the pipeline.',
    }),
    testSubject: 'descriptionField',
  },
  processors: {
    title: i18n.translate('xpack.ingestPipelines.form.processorsFielditle', {
      defaultMessage: 'Processors',
    }),
    description: i18n.translate('xpack.ingestPipelines.form.processorsFieldDescription', {
      defaultMessage: 'The processors to apply to the pipeline.',
    }),
    ariaLabel: i18n.translate('xpack.ingestPipelines.form.processorsFieldAriaLabel', {
      defaultMessage: 'Processors JSON editor',
    }),
    testSubject: 'processorsField',
  },
  onFailure: {
    title: i18n.translate('xpack.ingestPipelines.form.onFailureFielditle', {
      defaultMessage: 'On failure',
    }),
    description: i18n.translate('xpack.ingestPipelines.form.onFailureFieldDescription', {
      defaultMessage: 'The on-failure processors to apply to the pipeline.',
    }),
    ariaLabel: i18n.translate('xpack.ingestPipelines.form.onFailureFieldAriaLabel', {
      defaultMessage: 'On failure processors JSON editor',
    }),
    testSubject: 'onFailureField',
  },
  version: {
    title: i18n.translate('xpack.ingestPipelines.form.versionTitle', {
      defaultMessage: 'Version',
    }),
    description: i18n.translate('xpack.ingestPipelines.form.versionDescription', {
      defaultMessage: 'A number that identifies the pipeline to external management systems.',
    }),
    testSubject: 'versionField',
  },
};

const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });

export const PipelineForm: React.FunctionComponent<Props> = ({
  defaultValue = {
    name: '',
    description: '',
    processors: [],
    onFailure: [],
    version: '',
  },
  onSave,
  isSaving,
  saveError,
}) => {
  const [isFormValid, setIsFormValid] = useState<boolean>(true);

  const setDataAndValidation: FormConfig['onSubmit'] = (formData, isValid) => {
    setIsFormValid(isValid);

    if (isValid) {
      onSave(formData);
    }
  };

  const { form } = useForm({
    schema: pipelineFormSchema,
    defaultValue,
    onSubmit: setDataAndValidation,
  });

  const { name, description, version, processors, onFailure } = fieldsMeta;

  return (
    <>
      {saveError ? (
        // TODO save error goes here
        <div />
      ) : null}

      <Form form={form} data-test-subj="pipelineForm">
        {/* Name field */}
        <FormRow title={name.title} description={name.description}>
          <UseField
            path="name"
            componentProps={{
              ['data-test-subj']: name.testSubject,
            }}
          />
        </FormRow>

        {/* Description */}
        <FormRow title={description.title} description={description.description}>
          <UseField
            path="description"
            componentProps={{
              ['data-test-subj']: description.testSubject,
            }}
          />
        </FormRow>

        {/* Processors field */}
        <FormRow title={processors.title} description={processors.description}>
          <UseField
            path="processors"
            component={JsonEditorField}
            componentProps={{
              euiCodeEditorProps: {
                height: '400px',
                'aria-label': processors.ariaLabel,
              },
            }}
          />
        </FormRow>

        {/* On failure field */}
        <FormRow title={onFailure.title} description={onFailure.description}>
          <UseField
            path="onFailure"
            component={JsonEditorField}
            componentProps={{
              euiCodeEditorProps: {
                height: '400px',
                'aria-label': onFailure.ariaLabel,
              },
            }}
          />
        </FormRow>

        {/* Version field */}
        <FormRow title={version.title} description={version.description}>
          <UseField
            path="version"
            componentProps={{
              ['data-test-subj']: version.testSubject,
            }}
          />
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
                  disabled={isFormValid === false}
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
