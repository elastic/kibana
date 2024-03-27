/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import classNames from 'classnames';

import { i18n } from '@kbn/i18n';

import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOutsideClickDetector,
  EuiSpacer,
} from '@elastic/eui';

import { useForm, Form, FormDataProvider, UseField } from '../../../../shared_imports';
import { EUI_SIZE, TYPE_DEFINITION } from '../../../../constants';
import { useDispatch } from '../../../../mappings_state_context';
import { fieldSerializer } from '../../../../lib';
import { Field, NormalizedFields, MainType } from '../../../../types';
import { NameParameter, TypeParameter, SubTypeParameter } from '../../field_parameters';
import { FieldBetaBadge } from '../field_beta_badge';
import { getRequiredParametersFormForType } from './required_parameters_forms';
import { InferenceIdSelects } from '../../field_parameters/inference_id_selects';
import { ReferenceFieldSelects } from '../../field_parameters/reference_field_selects';

const formWrapper = (props: any) => <form {...props} />;

interface Props {
  allFields: NormalizedFields['byId'];
  isRootLevelField: boolean;
  isMultiField?: boolean;
  paddingLeft?: number;
  isCancelable?: boolean;
  maxNestedDepth?: number;
  onCancelAddingNewFields?: () => void;
  isAddingFields?: boolean;
  isSemanticTextEnabled?: boolean;
}

export const CreateField = React.memo(function CreateFieldComponent({
  allFields,
  isRootLevelField,
  isMultiField,
  paddingLeft,
  isCancelable,
  maxNestedDepth,
  onCancelAddingNewFields,
  isAddingFields,
  isSemanticTextEnabled,
}: Props) {
  const dispatch = useDispatch();

  const { form } = useForm<Field>({
    serializer: fieldSerializer,
    options: { stripEmptyFields: false },
  });

  const { subscribe } = form;

  useEffect(() => {
    const subscription = subscribe((updatedFieldForm) => {
      dispatch({ type: 'fieldForm.update', value: updatedFieldForm });
    });

    return subscription.unsubscribe;
  }, [dispatch, subscribe]);

  const cancel = () => {
    if (isAddingFields && onCancelAddingNewFields) {
      onCancelAddingNewFields();
    } else {
      dispatch({ type: 'documentField.changeStatus', value: 'idle' });
    }
  };

  const submitForm = async (e?: React.FormEvent, exitAfter: boolean = false) => {
    if (e) {
      e.preventDefault();
    }

    const { isValid, data } = await form.submit();

    if (isValid) {
      form.reset();
      if (data.type === 'semantic_text') {
        dispatch({ type: 'field.addSemanticText', value: data });
      } else {
        dispatch({ type: 'field.add', value: data });
      }

      if (exitAfter) {
        cancel();
      }
    }
  };

  const onClickOutside = () => {
    const name = form.getFields().name.value as string;

    if (name.trim() === '') {
      if (isCancelable !== false) {
        cancel();
      }
    } else {
      submitForm(undefined, true);
    }
  };

  const renderFormFields = () => (
    <EuiFlexGroup gutterSize="s">
      {/* Field type */}
      <EuiFlexItem grow={false}>
        <TypeParameter
          isRootLevelField={isRootLevelField}
          isMultiField={isMultiField}
          showDocLink
          isSemanticTextEnabled={isSemanticTextEnabled}
        />
      </EuiFlexItem>

      {/* Field subType (if any) */}
      <FormDataProvider pathsToWatch="type">
        {({ type }) => {
          if (type === undefined) {
            return null;
          }

          const [fieldType] = type;
          return (
            <SubTypeParameter
              key={fieldType?.value}
              type={fieldType?.value}
              isMultiField={isMultiField ?? false}
              isRootLevelField={isRootLevelField}
            />
          );
        }}
      </FormDataProvider>

      {/* Field reference_field for semantic_text field type */}
      <FormDataProvider pathsToWatch="type">
        {({ type }) => {
          if (type === undefined || type[0]?.value !== 'semantic_text') {
            return null;
          }

          return (
            <EuiFlexItem grow={false}>
              <UseField path="reference_field">
                {(field) => (
                  <div className="mappingsEditor__selectSemanticTextReferenceField">
                    <ReferenceFieldSelects onChange={field.setValue} />
                  </div>
                )}
              </UseField>
            </EuiFlexItem>
          );
        }}
      </FormDataProvider>

      {/* Field name */}
      <EuiFlexItem>
        <NameParameter />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const renderFormActions = () => (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
      {(isCancelable !== false || isAddingFields) && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={cancel} data-test-subj="cancelButton">
            {i18n.translate('xpack.idxMgmt.mappingsEditor.createField.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButton
          color="primary"
          fill
          onClick={submitForm}
          type="submit"
          data-test-subj="addButton"
        >
          {isMultiField
            ? i18n.translate('xpack.idxMgmt.mappingsEditor.createField.addMultiFieldButtonLabel', {
                defaultMessage: 'Add multi-field',
              })
            : i18n.translate('xpack.idxMgmt.mappingsEditor.createField.addFieldButtonLabel', {
                defaultMessage: 'Add field',
              })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiOutsideClickDetector onOutsideClick={onClickOutside}>
      <Form
        form={form}
        FormWrapper={formWrapper}
        onSubmit={submitForm}
        data-test-subj="createFieldForm"
      >
        <div
          className={classNames('mappingsEditor__createFieldWrapper', {
            'mappingsEditor__createFieldWrapper--toggle':
              Boolean(maxNestedDepth) && maxNestedDepth! > 0,
            'mappingsEditor__createFieldWrapper--multiField': isMultiField,
          })}
          style={{
            paddingLeft: `${
              isMultiField
                ? paddingLeft! - EUI_SIZE * 1.5 // As there are no "L" bullet list we need to substract some indent
                : paddingLeft
            }px`,
          }}
        >
          <div className="mappingsEditor__createFieldContent">
            <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem className="mappingsEditor__createFieldContent__formFields">
                {renderFormFields()}
              </EuiFlexItem>
            </EuiFlexGroup>

            <FormDataProvider pathsToWatch={['type', 'subType']}>
              {({ type, subType }) => {
                const RequiredParametersForm = getRequiredParametersFormForType(
                  type?.[0]?.value,
                  subType?.[0]?.value
                );

                if (!RequiredParametersForm) {
                  return null;
                }

                const typeDefinition = TYPE_DEFINITION[type?.[0].value as MainType];

                return (
                  <div className="mappingsEditor__createFieldRequiredProps">
                    {typeDefinition.isBeta ? (
                      <>
                        <FieldBetaBadge />
                        <EuiSpacer size="m" />
                      </>
                    ) : null}

                    <RequiredParametersForm key={subType ?? type} allFields={allFields} />
                  </div>
                );
              }}
            </FormDataProvider>
            {/* Field inference_id for semantic_text field type */}
            <FormDataProvider pathsToWatch="type">
              {({ type }) => {
                if (type === undefined || type[0]?.value !== 'semantic_text') {
                  return null;
                }

                return (
                  <>
                    <EuiSpacer />
                    <EuiFlexGroup gutterSize="s" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <UseField path="inference_id">
                          {(field) => (
                            <div className="mappingsEditor__selectSemanticTextInferenceId">
                              <InferenceIdSelects onChange={field.setValue} />
                            </div>
                          )}
                        </UseField>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                );
              }}
            </FormDataProvider>

            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={true} />
              <EuiFlexItem grow={false}>{renderFormActions()}</EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </div>
      </Form>
    </EuiOutsideClickDetector>
  );
});
