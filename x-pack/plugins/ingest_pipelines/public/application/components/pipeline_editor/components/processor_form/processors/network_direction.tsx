/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { FieldsConfig, from, to } from './shared';
import { TargetField } from './common_fields/target_field';
import { SerializerFunc } from '../../../../../../shared_imports';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FIELD_TYPES, UseField, UseMultiFields, useFormData, Field, FieldHook, FieldConfig, fieldValidators } from '../../../../../../shared_imports';

interface InternalNetworkTypes {
  internal_networks: string[];
  internal_networks_field: string;
}

type InternalNetworkFields = {
  [K in keyof InternalNetworkTypes]: FieldHook<InternalNetworkTypes[K]>;
};

const fieldsConfig: FieldsConfig = {
  /* Optional fields config */
  source_ip: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.networkDirection.sourceIpLabel',
      {
        defaultMessage: 'Source IP (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.networkDirection.sourceIpHelpText"
        defaultMessage="Field containing the source IP address. Defaults to {defaultField}."
        values={{
          defaultField: <EuiCode>{'source.ip'}</EuiCode>,
        }}
      />
    ),
  },
  destination_ip: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.networkDirection.destinationIpLabel',
      {
        defaultMessage: 'Destination IP (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.networkDirection.destionationIpHelpText"
        defaultMessage="Field containing the destination IP address. Defaults to {defaultField}."
        values={{
          defaultField: <EuiCode>{'destination.ip'}</EuiCode>,
        }}
      />
    ),
  },
};

const internalNetworkValues: string[] = [
  'loopback',
  'unicast',
  'global_unicast',
  'multicast',
  'interface_local_multicast',
  'link_local_unicast',
  'link_local_multicast',
  'link_local_multicast',
  'private',
  'public',
  'unspecified',
];

const internalNetworkConfig: Record<
  keyof InternalNetworkFields,
  { path: string; config?: FieldConfig<any>, euiFieldProps?: Record<string, any> }
> = {
  internal_networks: {
    path: 'fields.internal_networks',
    euiFieldProps: {
      noSuggestions: false,
      options: internalNetworkValues.map(label => ({ label }))
    },
    config: {
      type: FIELD_TYPES.COMBO_BOX,
      deserializer: to.arrayOfStrings,
      serializer: from.optionalArrayOfStrings,
      validations: [
        {
          validator: fieldValidators.emptyField(
            i18n.translate('xpack.ingestPipelines.pipelineEditor.networkDirection.internalNetworksRequiredError', {
              defaultMessage: 'A value is required.',
            })
          ),
        },
      ],
      label: i18n.translate(
        'xpack.ingestPipelines.pipelineEditor.networkDirection.internalNetworksLabel',
        {
          defaultMessage: 'Internal networks',
        }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.networkDirection.internalNetworksHelpText"
          defaultMessage="List of internal networks."
        />
      ),
    }
  },
  internal_networks_field: {
    path: 'fields.internal_networks_field',
    config: {
      type: FIELD_TYPES.TEXT,
      serializer: from.emptyStringToUndefined,
      validations: [
        {
          validator: fieldValidators.emptyField(
            i18n.translate('xpack.ingestPipelines.pipelineEditor.networkDirection.internalNetworksFieldRequiredError', {
              defaultMessage: 'A value is required.',
            })
          ),
        },
      ],
      label: i18n.translate(
        'xpack.ingestPipelines.pipelineEditor.networkDirection.internalNetworksFieldLabel',
        {
          defaultMessage: 'Internal networks field',
        }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.networkDirection.internalNetworksFieldHelpText"
          defaultMessage="A field on the given document to read the {field} configuration from."
          values={{
            field: <EuiCode>{'internal_networks'}</EuiCode>,
          }}
        />
      ),
    }
  },
};

// TODO: when loading the form, setup correct default in EuiButtonGroup
// TODO: When switching the EuiButtonGroup, clear both values for required fields
export const NetworkDirection: FunctionComponent = () => {
  const [{ fields }] = useFormData();
  const [isCustom, setIsCustom] = useState(fields?.internal_networks_field !== '');

  return (
    <>
      <UseField
        config={fieldsConfig.source_ip}
        component={Field}
        path="fields.source_ip"
      />

      <UseField
        config={fieldsConfig.destination_ip}
        component={Field}
        path="fields.destination_ip"
      />

      <TargetField
        helpText={
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.networkDirection.targetFieldHelpText"
            defaultMessage="Output field. Defaults to {field}."
            values={{
              field: <EuiCode>{'network.direction'}</EuiCode>,
            }}
          />
        }
      />

      <UseMultiFields fields={internalNetworkConfig}>
        {({ internal_networks, internal_networks_field }) => {
          // The fields need to be optionally rendered for this custom solution to work
          const field = isCustom ? internal_networks_field : internal_networks;
          const configKey: keyof InternalNetworkTypes = isCustom ? 'internal_networks_field' : 'internal_networks';

          return (
            <Field
              field={field}
              euiFieldProps={internalNetworkConfig[configKey].euiFieldProps}
              labelAppend={(
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => setIsCustom(!isCustom)}
                >
                  {isCustom
                    ? i18n.translate('xpack.idxMgmt.mappingsEditor.predefinedButtonLabel', {
                      defaultMessage: 'Use preset fields',
                  })
                  : i18n.translate('xpack.idxMgmt.mappingsEditor.customButtonLabel', {
                    defaultMessage: 'Use custom field',
                  })}
                </EuiButtonEmpty>
              )}
            />
          );
        }}
      </UseMultiFields>

      <IgnoreMissingField
        defaultValue={true}
        serializer={from.undefinedIfValue(true) as SerializerFunc<boolean>}
      />
    </>
  );
};
