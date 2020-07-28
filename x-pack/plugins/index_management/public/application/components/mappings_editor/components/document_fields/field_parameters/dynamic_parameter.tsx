/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../services/documentation';
import { UseField, CheckBoxField } from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';
import { Field } from '../../../types';
import { EditFieldFormRow } from '../fields/edit_field';

/**
 * Export custom serializer to be used when we need to serialize the form data to be sent to ES
 * @param field The field to be serialized
 */
export const dynamicSerializer = (field: Field): Field => {
  if (field.dynamic_toggle === undefined) {
    return field;
  }

  const dynamic =
    field.dynamic_toggle === true ? true : field.dynamic_strict === true ? 'strict' : false;
  const { dynamic_toggle, dynamic_strict, ...rest } = field;

  return {
    ...rest,
    dynamic,
  };
};

/**
 * Export custom deserializer to be used when we need to deserialize the data coming from ES
 * @param field The field to be serialized
 */
export const dynamicDeserializer = (field: Field): Field => {
  if (field.dynamic === undefined) {
    return field;
  }

  const dynamicToggleValue = field.dynamic === true;
  const dynamicStrictValue = field.dynamic === 'strict';

  return {
    ...field,
    dynamic_toggle: dynamicToggleValue,
    dynamic_strict: dynamicStrictValue,
  };
};
interface Props {
  defaultToggleValue: boolean;
}

export const DynamicParameter = ({ defaultToggleValue }: Props) => {
  return (
    <EditFieldFormRow
      title={i18n.translate(
        'xpack.idxMgmt.mappingsEditor.dynamicPropertyMappingParameter.fieldTitle',
        {
          defaultMessage: 'Dynamic property mapping',
        }
      )}
      description={i18n.translate(
        'xpack.idxMgmt.mappingsEditor.dynamicPropertyMappingParameter.fieldDescription',
        {
          defaultMessage:
            'By default, properties can be added dynamically to objects within a document, just by indexing a document with the object containing the new property.',
        }
      )}
      docLink={{
        text: i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicDocLinkText', {
          defaultMessage: 'Dynamic documentation',
        }),
        href: documentationService.getDynamicLink(),
      }}
      formFieldPath="dynamic_toggle"
      defaultToggleValue={defaultToggleValue}
    >
      {(isOn) => {
        return isOn === false ? (
          <UseField
            path="dynamic_strict"
            config={getFieldConfig('dynamic_strict')}
            component={CheckBoxField}
          />
        ) : null;
      }}
    </EditFieldFormRow>
  );
};
