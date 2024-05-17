/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import React, { FunctionComponent, useEffect, useState } from 'react';
import {
  FIELD_TYPES,
  ToggleField,
  UseField,
  useFormContext,
} from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';
import { TARGET_FIELD_PATH, TargetField } from './common_fields/target_field';
import { FieldsConfig, from, to } from './shared';

const ADD_TO_ROOT_FIELD_PATH = 'fields.add_to_root';

const fieldsConfig: FieldsConfig = {
  /* Optional fields config */
  add_to_root: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.jsonForm.addToRootFieldLabel', {
      defaultMessage: 'Add to root',
    }),
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(false),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.jsonForm.addToRootFieldHelpText',
      {
        defaultMessage:
          'Add the JSON object to the top level of the document. Cannot be combined with a target field.',
      }
    ),
  },
};

export const Json: FunctionComponent = () => {
  const form = useFormContext();
  const [isAddToPathDisabled, setIsAddToPathDisabled] = useState<boolean>(false);
  useEffect(() => {
    const subscription = form.subscribe(({ data: { internal } }) => {
      const hasTargetField = !!get(internal, TARGET_FIELD_PATH);
      if (hasTargetField && !isAddToPathDisabled) {
        setIsAddToPathDisabled(true);
        form.getFields()[ADD_TO_ROOT_FIELD_PATH].setValue(false);
      } else if (!hasTargetField && isAddToPathDisabled) {
        setIsAddToPathDisabled(false);
      }
    });
    return subscription.unsubscribe;
  }, [form, isAddToPathDisabled]);

  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.jsonForm.fieldNameHelpText',
          { defaultMessage: 'Field to parse.' }
        )}
      />

      <TargetField />

      <UseField
        config={fieldsConfig.add_to_root}
        component={ToggleField}
        componentProps={{
          euiFieldProps: {
            disabled: isAddToPathDisabled,
          },
        }}
        path={ADD_TO_ROOT_FIELD_PATH}
      />
    </>
  );
};
