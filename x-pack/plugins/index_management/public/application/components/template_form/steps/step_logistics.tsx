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
  JsonEditorField,
} from '../../../../shared_imports';
import { documentationService } from '../../../services/documentation';
import { schemas, nameConfig, nameConfigWithoutValidations } from '../template_form_schemas';

// Create or Form components with partial props that are common to all instances
const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });

const fieldsMeta = {
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
      defaultMessage: 'Merge priority',
    }),
    description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.priorityDescription', {
      defaultMessage: 'The merge priority when multiple templates match an index.',
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

interface Props {
  defaultValue: { [key: string]: any };
  onChange: (content: Forms.Content) => void;
  isEditing?: boolean;
  isLegacy?: boolean;
}

export const StepLogistics: React.FunctionComponent<Props> = React.memo(
  ({ defaultValue, isEditing = false, onChange, isLegacy = false }) => {
    const { form } = useForm({
      schema: schemas.logistics,
      defaultValue,
      options: { stripEmptyFields: false },
    });

    /**
     * When the consumer call validate() on this step, we submit the form so it enters the "isSubmitted" state
     * and we can display the form errors on top of the forms if there are any.
     */
    const validate = async () => {
      return (await form.submit()).isValid;
    };

    useEffect(() => {
      onChange({
        isValid: form.isValid,
        validate,
        getData: form.getFormData,
      });
    }, [form.isValid, onChange]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      const subscription = form.subscribe(({ data, isValid }) => {
        onChange({
          isValid,
          validate,
          getData: data.format,
        });
      });
      return subscription.unsubscribe;
    }, [onChange]); // eslint-disable-line react-hooks/exhaustive-deps

    const { name, indexPatterns, order, priority, version } = fieldsMeta;

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
              href={documentationService.getTemplatesDocumentationLink()}
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
          isInvalid={form.isSubmitted && !form.isValid}
          error={form.getErrors()}
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
                </>
              }
            >
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
            </FormRow>
          )}
        </Form>
      </>
    );
  }
);
