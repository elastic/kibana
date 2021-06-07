/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCode, EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { FieldsConfig, from, to } from './shared';
import { TargetField } from './common_fields/target_field';
import { SerializerFunc } from '../../../../../../shared_imports';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FIELD_TYPES, UseField, useFormData, Field, ComboBoxField, fieldValidators } from '../../../../../../shared_imports';

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
  internal_networks: {
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
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.fingerprint.methodHelpText"
        defaultMessage="List of internal networks."
      />
    ),
  },
  internal_networks_field: {
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
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.networkDirection.internalNetworksFieldHelpText"
        defaultMessage="A field on the given document to read the {field} configuration from."
        values={{
          field: <EuiCode>{'internal_networks'}</EuiCode>,
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

// TODO: when loading the form, setup correct default in EuiButtonGroup
// TODO: When switching the EuiButtonGroup, clear both values for required fields
export const NetworkDirection: FunctionComponent = () => {
  const [{ fields }] = useFormData();
  const defaultInternalNetwork = fields?.internal_networks_field !== '' ? 'internal_networks_field' : 'internal_networks';
  const [internalNetworkType, setInternalNetworkType] = useState(defaultInternalNetwork);

  console.log(fields);

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

      <EuiSpacer size="m" />
      <EuiButtonGroup
        isFullWidth
        buttonSize="m"
        legend="Select internal network type"
        options={[
          {
            id: 'internal_networks',
            label: 'Internal networks'
          },
          {
            id: 'internal_networks_field',
            label: 'Internal networks field'
          }
        ]}
        idSelected={internalNetworkType}
        onChange={(id) => setInternalNetworkType(id)}
      />
      <EuiSpacer size="s" />

      <UseField
        componentProps={{
          euiFieldProps: {
            noSuggestions: false,
            options: internalNetworkValues.map(label => ({ label }))
          },
        }}
        config={fieldsConfig.internal_networks}
        component={ComboBoxField}
        path="fields.internal_networks"
        style={{ display: internalNetworkType === 'internal_networks' ? 'block' : 'none' }}
      />

      <UseField
        config={fieldsConfig.internal_networks_field}
        component={Field}
        path="fields.internal_networks_field"
        style={{ display: internalNetworkType === 'internal_networks_field' ? 'block' : 'none' }}
      />

      <IgnoreMissingField
        defaultValue={true}
        serializer={from.undefinedIfValue(true) as SerializerFunc<boolean>}
      />
    </>
  );
};
