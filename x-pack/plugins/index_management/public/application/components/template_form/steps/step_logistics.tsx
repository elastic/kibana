/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  useForm,
  useFormData,
  Form,
  getUseField,
  getFormRow,
  Field,
  Forms,
  JsonEditorField,
} from '../../../../shared_imports';
import { documentationService } from '../../../services/documentation';
import { schemas, nameConfig, nameConfigWithoutValidations } from '../template_form_schemas';

// Create or Form components with partial props that are common to all instances
const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });

function getFieldsMeta(esDocsBase: string) {
  return {
    name: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.nameTitle', {
        defaultMessage: 'Name',
      }),
      description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.nameDescription', {
        defaultMessage: 'A unique identifier for this template.',
      }),
      testSubject: 'nameField',
    },
    indexPatterns: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.indexPatternsTitle', {
        defaultMessage: 'Index patterns',
      }),
      description: i18n.translate(
        'xpack.idxMgmt.templateForm.stepLogistics.indexPatternsDescription',
        {
          defaultMessage: 'The index patterns to apply to the template.',
        }
      ),
      testSubject: 'indexPatternsField',
    },
    createDataStream: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.dataStreamTitle', {
        defaultMessage: 'Data stream',
      }),
      description: (
        <FormattedMessage
          id="xpack.idxMgmt.templateForm.stepLogistics.dataStreamDescription"
          defaultMessage="The template creates data streams instead of indices. {docsLink}"
          values={{
            docsLink: (
              <EuiLink
                href={documentationService.getDataStreamsDocumentationLink()}
                target="_blank"
                external
              >
                {i18n.translate(
                  'xpack.idxMgmt.templateForm.stepLogistics.dataStreamDocumentionLink',
                  {
                    defaultMessage: 'Learn more.',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      ),
      testSubject: 'dataStreamField',
    },
    order: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.orderTitle', {
        defaultMessage: 'Merge order',
      }),
      description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.orderDescription', {
        defaultMessage: 'The merge order when multiple templates match an index.',
      }),
      testSubject: 'orderField',
    },
    priority: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.priorityTitle', {
        defaultMessage: 'Priority',
      }),
      description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.priorityDescription', {
        defaultMessage: 'Only the highest priority template will be applied.',
      }),
      testSubject: 'priorityField',
    },
    version: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.versionTitle', {
        defaultMessage: 'Version',
      }),
      description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.versionDescription', {
        defaultMessage: 'A number that identifies the template to external management systems.',
      }),
      testSubject: 'versionField',
    },
  };
}

interface LogisticsForm {
  [key: string]: any;
}

interface LogisticsFormInternal extends LogisticsForm {
  addMeta: boolean;
  doCreateDataStream: boolean;
}

interface Props {
  defaultValue: LogisticsForm;
  onChange: (content: Forms.Content) => void;
  isEditing?: boolean;
  isLegacy?: boolean;
}

function formDeserializer(formData: LogisticsForm): LogisticsFormInternal {
  return {
    ...formData,
    addMeta: Boolean(formData._meta && Object.keys(formData._meta).length),
    doCreateDataStream: Boolean(formData.dataStream),
  };
}

function getformSerializer(initialTemplateData: LogisticsForm = {}) {
  return (formData: LogisticsFormInternal): LogisticsForm => {
    const { addMeta, doCreateDataStream, ...rest } = formData;
    const dataStream = doCreateDataStream ? initialTemplateData.dataStream ?? {} : undefined;
    return { ...rest, dataStream };
  };
}

export const StepLogistics: React.FunctionComponent<Props> = React.memo(
  ({ defaultValue, isEditing = false, onChange, isLegacy = false }) => {
    const { form } = useForm({
      schema: schemas.logistics,
      defaultValue,
      options: { stripEmptyFields: false },
      serializer: getformSerializer(defaultValue),
      deserializer: formDeserializer,
    });
    const {
      submit,
      isSubmitted,
      isValid: isFormValid,
      getErrors: getFormErrors,
      getFormData,
    } = form;

    const [{ addMeta }] = useFormData<{ addMeta: boolean }>({
      form,
      watch: 'addMeta',
    });

    /**
     * When the consumer call validate() on this step, we submit the form so it enters the "isSubmitted" state
     * and we can display the form errors on top of the forms if there are any.
     */
    const validate = useCallback(async () => {
      return (await submit()).isValid;
    }, [submit]);

    useEffect(() => {
      onChange({
        isValid: isFormValid,
        getData: getFormData,
        validate,
      });
    }, [onChange, isFormValid, validate, getFormData]);

    const { name, indexPatterns, createDataStream, order, priority, version } = getFieldsMeta(
      documentationService.getEsDocsBase()
    );

    return (
      <>
        {/* Header */}
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.idxMgmt.templateForm.stepLogistics.stepTitle"
                  defaultMessage="Logistics"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={documentationService.getTemplatesDocumentationLink(isLegacy)}
              target="_blank"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepLogistics.docsButtonLabel"
                defaultMessage="Index Templates docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <Form
          form={form}
          isInvalid={isSubmitted && !isFormValid}
          error={getFormErrors()}
          data-test-subj="stepLogistics"
        >
          {/* Name */}
          <FormRow title={name.title} description={name.description}>
            <UseField
              path="name"
              componentProps={{
                ['data-test-subj']: name.testSubject,
                euiFieldProps: { disabled: isEditing },
              }}
              config={isEditing ? nameConfigWithoutValidations : nameConfig}
            />
          </FormRow>

          {/* Index patterns */}
          <FormRow title={indexPatterns.title} description={indexPatterns.description}>
            <UseField
              path="indexPatterns"
              componentProps={{
                ['data-test-subj']: indexPatterns.testSubject,
              }}
            />
          </FormRow>

          {/* Create data stream */}
          {isLegacy !== true && (
            <FormRow title={createDataStream.title} description={createDataStream.description}>
              <UseField
                path="doCreateDataStream"
                componentProps={{ 'data-test-subj': createDataStream.testSubject }}
              />
            </FormRow>
          )}

          {/* Order */}
          {isLegacy && (
            <FormRow title={order.title} description={order.description}>
              <UseField
                path="order"
                componentProps={{
                  ['data-test-subj']: order.testSubject,
                }}
              />
            </FormRow>
          )}

          {/* Priority */}
          {isLegacy === false && (
            <FormRow title={priority.title} description={priority.description}>
              <UseField
                path="priority"
                componentProps={{
                  ['data-test-subj']: priority.testSubject,
                }}
              />
            </FormRow>
          )}

          {/* Version */}
          <FormRow title={version.title} description={version.description}>
            <UseField
              path="version"
              componentProps={{
                ['data-test-subj']: version.testSubject,
              }}
            />
          </FormRow>

          {/* _meta */}
          {isLegacy === false && (
            <FormRow
              title={i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.metaFieldTitle', {
                defaultMessage: '_meta field',
              })}
              description={
                <>
                  <FormattedMessage
                    id="xpack.idxMgmt.templateForm.stepLogistics.metaFieldDescription"
                    defaultMessage="Use the _meta field to store any metadata you want."
                  />
                  <EuiSpacer size="m" />
                  <UseField path="addMeta" data-test-subj="metaToggle" />
                </>
              }
            >
              {addMeta && (
                <UseField
                  path="_meta"
                  component={JsonEditorField}
                  componentProps={{
                    euiCodeEditorProps: {
                      height: '280px',
                      'aria-label': i18n.translate(
                        'xpack.idxMgmt.templateForm.stepLogistics.metaFieldEditorAriaLabel',
                        {
                          defaultMessage: '_meta field data editor',
                        }
                      ),
                      'data-test-subj': 'metaField',
                    },
                  }}
                />
              )}
            </FormRow>
          )}
        </Form>
      </>
    );
  }
);
