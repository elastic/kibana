/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FunctionComponent } from 'react';

import {
  FIELD_TYPES,
  FieldConfig,
  ToggleField,
  UseField,
} from '../../../../../../../shared_imports';

import { FieldsConfig, from, to } from '../shared';

export const fieldsConfig: FieldsConfig = {
  ignore_missing: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(false),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.commonFields.ignoreMissingFieldLabel',
      {
        defaultMessage: 'Ignore missing',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.commonFields.ignoreMissingFieldHelpText"
        defaultMessage="Ignore documents with a missing {field}."
        values={{
          field: <EuiCode>{'field'}</EuiCode>,
        }}
      />
    ),
  },
};

type Props = Partial<FieldConfig>;

export const IgnoreMissingField: FunctionComponent<Props> = (props) => (
  <UseField
    config={{ ...fieldsConfig.ignore_missing, ...props }}
    component={ToggleField}
    path="fields.ignore_missing"
    data-test-subj="ignoreMissingSwitch"
  />
);
