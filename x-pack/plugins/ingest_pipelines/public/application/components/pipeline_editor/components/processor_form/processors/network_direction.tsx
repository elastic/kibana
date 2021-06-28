/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { FieldsConfig, from, to } from './shared';

import { TargetField } from './common_fields/target_field';
import { SerializerFunc } from '../../../../../../shared_imports';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FIELD_TYPES, UseField, TextField, ComboBoxField, useFormData, Field, FieldHook } from '../../../../../../shared_imports';

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
  },
  internal_networks_field: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
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

const getCustomPath = (isCustom: boolean) =>
  isCustom
    ? 'fields.internal_networks_field'
    : 'fields.internal_networks';

const getCustomConfig = (isCustom: boolean) =>
  isCustom
    ? fieldsConfig.internal_networks_field
    : fieldsConfig.internal_networks;


// TODO: when loading the form, setup correct default in EuiButtonGroup
// TODO: When switching the EuiButtonGroup, clear both values for required fields
export const NetworkDirection: FunctionComponent = () => {
  const [{ fields }] = useFormData();
  const [isCustom, setIsCustom] = useState(fields?.internal_networks_field?.length > 0);

  console.log(fields);

  const toggleCustom = (field: FieldHook) => () => {
    if (isCustom) {
      field.setValue([]);
    } else {
      field.setValue('');
    }

    field.reset({ resetValue: false });

    setIsCustom(!isCustom);
  };

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

      <UseField path={getCustomPath(isCustom)} config={getCustomConfig(isCustom)}>
        {(field) => (
          <div className="mappingsEditor__selectWithCustom">
            <EuiButtonEmpty
              size="xs"
              onClick={toggleCustom(field)}
              className="mappingsEditor__selectWithCustom__button"
            >
              {isCustom
                ? i18n.translate('xpack.ingestPipelines.networkDirection.builtInLabel', {
                    defaultMessage: 'Use built-in internal network type',
                  })
                : i18n.translate('xpack.ingestPipelines.networkDirection.customLabel', {
                    defaultMessage: 'Use custom internal network',
                  })}
            </EuiButtonEmpty>

            {/* Wrap inside a flex item to maintain the same padding around the field. */}
            <EuiFlexGroup>
              <EuiFlexItem>
                {isCustom ? (
                  <TextField field={field} />
                ) : (
                  <ComboBoxField
                    field={field}
                    euiFieldProps={{
                      noSuggestions: false,
                        options: internalNetworkValues.map(label => ({ label }))
                    }}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        )}
      </UseField>

      <EuiSpacer size="m" />

      <IgnoreMissingField
        defaultValue={true}
        serializer={from.undefinedIfValue(true) as SerializerFunc<boolean>}
      />
    </>
  );
};
