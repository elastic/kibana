/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';

import { FIELD_TYPES, UseField, Field, ToggleField } from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldsConfig, from, to } from './shared';
import { TargetField } from './common_fields/target_field';
import { PropertiesField } from './common_fields/properties_field';

const fieldsConfig: FieldsConfig = {
  /* Optional field config */
  database_file: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v === 'GeoLite2-City.mmdb' || v === '' ? undefined : v),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.geoIPForm.databaseFileLabel', {
      defaultMessage: 'Database file (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.geoIPForm.databaseFileHelpText"
        defaultMessage="GeoIP2 database file in the {ingestGeoIP} configuration directory. Defaults to {databaseFile}."
        values={{
          databaseFile: <EuiCode>{'GeoLite2-City.mmdb'}</EuiCode>,
          ingestGeoIP: <EuiCode>{'ingest-geoip'}</EuiCode>,
        }}
      />
    ),
  },

  first_only: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(true),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.geoIPForm.firstOnlyFieldLabel', {
      defaultMessage: 'First only',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.geoIPForm.firstOnlyFieldHelpText',
      {
        defaultMessage: 'Use the first matching geo data, even if the field contains an array.',
      }
    ),
  },
};

export const GeoIP: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.geoIPForm.fieldNameHelpText',
          { defaultMessage: 'Field containing an IP address for the geographical lookup.' }
        )}
      />

      <TargetField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.geoIPForm.targetFieldHelpText',
          {
            defaultMessage: 'Field used to contain geo data properties.',
          }
        )}
      />

      <UseField component={Field} config={fieldsConfig.database_file} path="fields.database_file" />

      <PropertiesField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.geoIPForm.propertiesFieldHelpText',
          {
            defaultMessage:
              'Properties added to the target field. Valid properties depend on the database file used.',
          }
        )}
      />

      <UseField component={ToggleField} config={fieldsConfig.first_only} path="fields.first_only" />

      <IgnoreMissingField />
    </>
  );
};
