/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FIELD_TYPES,
  UseField,
  ToggleField,
  useFormContext,
} from '../../../../../../shared_imports';

import { FieldsConfig, from, to } from './shared';
import { FieldNameField } from './common_fields/field_name_field';
import { TargetField, TARGET_FIELD_PATH } from './common_fields/target_field';

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
    serializer: from.defaultBoolToUndef(false),
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
    const subscription = form.subscribe(({ data: { raw: rawData } }) => {
      const hasTargetField = !!rawData[TARGET_FIELD_PATH];
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

      <TargetField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.jsonForm.targetFieldHelpText',
          { defaultMessage: 'Field used to contain the JSON object.' }
        )}
      />

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
