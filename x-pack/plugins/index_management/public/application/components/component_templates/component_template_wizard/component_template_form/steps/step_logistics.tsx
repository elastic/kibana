/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiSwitch,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  useForm,
  Form,
  getUseField,
  getFormRow,
  Field,
  Forms,
  JsonEditorField,
} from '../../../shared_imports';
import { useComponentTemplatesContext } from '../../../component_templates_context';
import { logisticsFormSchema } from './step_logistics_schema';

const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });

interface Props {
  defaultValue: { [key: string]: any };
  onChange: (content: Forms.Content) => void;
  isEditing?: boolean;
}

export const StepLogistics: React.FunctionComponent<Props> = React.memo(
  ({ defaultValue, isEditing, onChange }) => {
    const { form } = useForm({
      schema: logisticsFormSchema,
      defaultValue,
      options: { stripEmptyFields: false },
    });

    const { isValid: isFormValid, submit, getFormData, subscribe } = form;

    const { documentation } = useComponentTemplatesContext();

    const [isMetaVisible, setIsMetaVisible] = useState<boolean>(
      Boolean(defaultValue._meta && Object.keys(defaultValue._meta).length)
    );

    const validate = useCallback(async () => {
      return (await submit()).isValid;
    }, [submit]);

    useEffect(() => {
      onChange({
        isValid: isFormValid,
        validate,
        getData: getFormData,
      });
    }, [isFormValid, getFormData, validate, onChange]);

    useEffect(() => {
      const subscription = subscribe(({ data, isValid }) => {
        onChange({
          isValid,
          validate,
          getData: data.format,
        });
      });
      return subscription.unsubscribe;
    }, [subscribe, validate, onChange]);

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
              href={documentation.componentTemplates}
              target="_blank"
              iconType="help"
              data-test-subj="documentationLink"
            >
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplateForm.stepLogistics.docsButtonLabel"
                defaultMessage="Component Templates docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        {/* Name field */}
        <FormRow
          title={
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateForm.stepLogistics.nameTitle"
              defaultMessage="Name"
            />
          }
          description={
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateForm.stepLogistics.nameDescription"
              defaultMessage="Unique name for this component template."
            />
          }
        >
          <UseField
            path="name"
            componentProps={{
              ['data-test-subj']: 'nameField',
              euiFieldProps: { disabled: isEditing },
            }}
          />
        </FormRow>

        {/* version field */}
        <FormRow
          title={
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateForm.stepLogistics.versionTitle"
              defaultMessage="Version"
            />
          }
          description={
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateForm.stepLogistics.versionDescription"
              defaultMessage="Number used by external management systems to identify the component template."
            />
          }
        >
          <UseField
            path="version"
            componentProps={{
              ['data-test-subj']: 'versionField',
            }}
          />
        </FormRow>

        {/* _meta field */}
        <FormRow
          title={
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateForm.stepLogistics.metaTitle"
              defaultMessage="Metadata"
            />
          }
          description={
            <>
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplateForm.stepLogistics.metaDescription"
                defaultMessage="Arbitrary information about the template, stored in the cluster state. {learnMoreLink}"
                values={{
                  learnMoreLink: (
                    <EuiLink
                      href={documentation.componentTemplatesMetadata}
                      target="_blank"
                      external
                    >
                      {i18n.translate(
                        'xpack.idxMgmt.componentTemplateForm.stepLogistics.metaDocumentionLink',
                        {
                          defaultMessage: 'Learn more.',
                        }
                      )}
                    </EuiLink>
                  ),
                }}
              />

              <EuiSpacer size="m" />

              <EuiSwitch
                label={
                  <FormattedMessage
                    id="xpack.idxMgmt.componentTemplateForm.stepLogistics.metadataDescription"
                    defaultMessage="Add metadata"
                  />
                }
                checked={isMetaVisible}
                onChange={(e) => setIsMetaVisible(e.target.checked)}
                data-test-subj="metaToggle"
              />
            </>
          }
        >
          {isMetaVisible && (
            <UseField
              path="_meta"
              component={JsonEditorField}
              componentProps={{
                euiCodeEditorProps: {
                  ['data-test-subj']: 'metaEditor',
                  height: '200px',
                  'aria-label': i18n.translate(
                    'xpack.idxMgmt.componentTemplateForm.stepLogistics.metaAriaLabel',
                    {
                      defaultMessage: '_meta field data editor',
                    }
                  ),
                },
              }}
            />
          )}
        </FormRow>
      </Form>
    );
  }
);
