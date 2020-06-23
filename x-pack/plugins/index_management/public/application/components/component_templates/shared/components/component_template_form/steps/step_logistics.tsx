/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  useForm,
  Form,
  getUseField,
  getFormRow,
  Field,
  Forms,
  FieldConfig,
  FIELD_TYPES,
  fieldValidators,
} from '../../../../shared_imports';

const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });

const { emptyField } = fieldValidators;

const fieldsMeta = {
  name: {
    title: i18n.translate('xpack.idxMgmt.componentTemplateForm.stepLogistics.nameTitle', {
      defaultMessage: 'Name',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.componentTemplateForm.stepLogistics.nameDescription',
      {
        defaultMessage: 'A unique identifier for this component template.',
      }
    ),
    testSubject: 'nameField',
  },
  version: {
    title: i18n.translate('xpack.idxMgmt.componentTemplateForm.stepLogistics.versionTitle', {
      defaultMessage: 'Version',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.componentTemplateForm.stepLogistics.versionDescription',
      {
        defaultMessage: 'A number that identifies the template to external management systems.',
      }
    ),
    testSubject: 'versionField',
  },
};

const nameConfig: FieldConfig = {
  defaultValue: undefined,
  label: i18n.translate('xpack.idxMgmt.componentTemplateForm.stepLogistics.nameFieldLabel', {
    defaultMessage: 'Name',
  }),
  type: FIELD_TYPES.TEXT,
  validations: [
    {
      validator: emptyField(
        i18n.translate('xpack.idxMgmt.componentTemplateForm.validation.nameRequiredError', {
          defaultMessage: 'A component template name is required.',
        })
      ),
    },
  ],
};

interface Props {
  defaultValue: { [key: string]: any };
  onChange: (content: Forms.Content) => void;
  isEditing?: boolean;
}

export const StepLogistics: React.FunctionComponent<Props> = React.memo(
  ({ defaultValue, isEditing, onChange }) => {
    const { form } = useForm({
      defaultValue,
      options: { stripEmptyFields: false },
    });

    useEffect(() => {
      const validate = async () => {
        return (await form.submit()).isValid;
      };
      onChange({
        isValid: form.isValid,
        validate,
        getData: form.getFormData,
      });
    }, [form.isValid, onChange]); // eslint-disable-line react-hooks/exhaustive-deps

    const { name, version } = fieldsMeta;

    return (
      <Form form={form} data-test-subj="stepLogistics">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.idxMgmt.componentTemplateForm.stepLogistics.stepTitle"
                  defaultMessage="Logistics"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={'#'} // TODO
              target="_blank"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplateForm.stepLogistics.docsButtonLabel"
                defaultMessage="Index Templates docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        {/* Name */}
        <FormRow title={name.title} description={name.description}>
          <UseField
            path="name"
            config={nameConfig}
            component={Field}
            componentProps={{
              ['data-test-subj']: name.testSubject,
              euiFieldProps: { disabled: isEditing },
            }}
          />
        </FormRow>
        {/* Version */}
        {/* <FormRow title={version.title} description={version.description}>
          <UseField
            path="version"
            componentProps={{
              ['data-test-subj']: version.testSubject,
            }}
          />
        </FormRow> */}
      </Form>
    );
  }
);
