/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCode } from '@elastic/eui';

import {
  FIELD_TYPES,
  UseField,
  Field,
  ComboBoxField,
  ToggleField,
} from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldsConfig, from, to } from './shared';
import { TargetField } from './common_fields/target_field';

const fieldsConfig: FieldsConfig = {
  /* Optional field config */
  database_file: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v === 'GeoLite2-City.mmdb' ? undefined : v),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.geoIPForm.databaseFileLabel', {
      defaultMessage: 'Database file (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.geoIPForm.databaseFileHelpText"
        defaultMessage="The database filename in the geoip config directory. The default value is {databaseFile}."
        values={{ databaseFile: <EuiCode inline>{'GeoLite2-City.mmdb'}</EuiCode> }}
      />
    ),
  },

  properties: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.geoIPForm.propertiesFieldLabel', {
      defaultMessage: 'Properties (optional)',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.geoIPForm.propertiesFieldHelpText',
      {
        defaultMessage:
          'Controls what properties are added to the target field. Values depend on what is available from the database file.',
      }
    ),
  },

  first_only: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
    deserializer: to.booleanOrUndef,
    serializer: from.defaultBoolToUndef(true),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.geoIPForm.firstOnlyFieldLabel', {
      defaultMessage: 'First only',
    }),
  },
};

export const GeoIP: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.grokForm.fieldNameHelpText',
          { defaultMessage: 'The array field.' }
        )}
      />

      <TargetField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.geoIPForm.targetFieldHelpText',
          {
            defaultMessage:
              'The field that will hold the geographical information looked up from the Maxmind database.',
          }
        )}
      />

      <UseField component={Field} config={fieldsConfig.database_file} path="fields.database_file" />

      <UseField
        component={ComboBoxField}
        config={fieldsConfig.properties}
        path="fields.properties"
      />

      <UseField component={ToggleField} config={fieldsConfig.first_only} path="fields.first_only" />

      <IgnoreMissingField />
    </>
  );
};
