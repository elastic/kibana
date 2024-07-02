/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { ConnectorFieldsProps } from '../types';
import * as i18n from './translations';
import { TheHiveTLP } from './types';

const { emptyField } = fieldValidators;

const TheHiveFieldsComponent: React.FunctionComponent<ConnectorFieldsProps> = () => {

  const tlpOptions: Array<{ text: string, value: string }> = [
    {
      text: 'CLEAR',
      value: TheHiveTLP.CLEAR
    },
    {
      text: 'GREEN',
      value: TheHiveTLP.GREEN
    },
    {
      text: 'AMBER',
      value: TheHiveTLP.AMBER
    },
    {
      text: 'AMBER+STRICT',
      value: TheHiveTLP.AMBER_STRICT
    },
    {
      text: 'RED',
      value: TheHiveTLP.RED
    }
  ];

  return (
    <div data-test-subj={'connector-fields-Thehive'}>
      <UseField
        path="fields.tlp"
        component={SelectField}
        config={{
          label: i18n.TLP_LABEL,
          validations: [
            {
              validator: emptyField(i18n.TLP_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'tlp-field',
            options: tlpOptions,
            fullWidth: true,
            hasNoInitialSelection: true,
          },
        }}
      />
    </div>
  );
};

TheHiveFieldsComponent.displayName = 'ThehiveFields';

// eslint-disable-next-line import/no-default-export
export { TheHiveFieldsComponent as default };
