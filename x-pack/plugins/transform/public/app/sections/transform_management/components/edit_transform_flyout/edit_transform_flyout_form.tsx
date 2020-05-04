/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useReducer, FC } from 'react';

import { EuiForm } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { TransformPivotConfig } from '../../../../common';

import { EditTransformFlyoutFormTextInput } from './edit_transform_flyout_form_text_input';

const stringValidator = (arg: any): string[] => (typeof arg === 'string' ? [] : ['No String!!']);
const shortStringValidator = (arg: any): string[] => [
  ...validate.string(arg),
  ...(arg.length < 10 ? [] : ['Too long!!!']),
];
const frequencyValidator = (arg: any): string[] => {
  if (!/^([0-9]+[d|h|m|s|])$/.test(arg)) {
    return ['Not a valid time unit!'];
  }
  return [];
};

const validate = {
  string: stringValidator,
  shortString: shortStringValidator,
  frequency: frequencyValidator,
};

interface Field {
  errorMessages: string[];
  isOptional: boolean;
  validator: keyof typeof validate;
  value: string;
}

const defaultField: Field = {
  errorMessages: [],
  isOptional: true,
  validator: 'string',
  value: '',
};

interface State {
  description: Field;
  frequency: Field;
}

interface Action {
  field: keyof State;
  value: string;
}

const reducer = (state: State, { field, value }: Action): State => {
  return {
    ...state,
    [field]: {
      ...state[field],
      errorMessages:
        state[field].isOptional && value.length === 0
          ? []
          : validate[state[field].validator](value),
      value,
    },
  };
};

interface EditTransformFlyoutForm {
  config: TransformPivotConfig;
}

export const EditTransformFlyoutForm: FC<EditTransformFlyoutForm> = ({ config }) => {
  const [state, dispatch] = useReducer(reducer, {
    description: { ...defaultField, value: config?.description ?? '' },
    frequency: { ...defaultField, value: config?.frequency ?? '', validator: 'frequency' },
  });

  return (
    <EuiForm>
      <EditTransformFlyoutFormTextInput
        errorMessages={state.description.errorMessages}
        value={state.description.value}
        label={i18n.translate('xpack.transform.transformList.editFlyoutFormDescriptionLabel', {
          defaultMessage: 'Description',
        })}
        onChange={value => dispatch({ field: 'description', value })}
      />
      {/*
      <EditTransformFlyoutFormTextInput
        defaultValue={config.dest.index}
        label={i18n.translate('xpack.transform.transformList.editFlyoutFormDestinationIndexLabel', {
          defaultMessage: 'Destination Index',
        })}
        onChange={onChangeDestinationIndexHandler}
      />*/}
      <EditTransformFlyoutFormTextInput
        errorMessages={state.frequency.errorMessages}
        value={state.frequency.value}
        helpText={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyHelptext', {
          defaultMessage:
            'The interval between checks for changes in the source indices when the transform is running continuously. Also determines the retry interval in the event of transient failures while the transform is searching or indexing. The minimum value is 1s and the maximum is 1h. The default value is 1m.',
        })}
        label={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyLabel', {
          defaultMessage: 'Frequency',
        })}
        onChange={value => dispatch({ field: 'frequency', value })}
      />
    </EuiForm>
  );
};
