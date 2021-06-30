/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { FieldsConfig, from, to } from './shared';
import { TargetField } from './common_fields/target_field';
import { SerializerFunc } from '../../../../../../shared_imports';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import {
  FIELD_TYPES,
  UseField,
  UseMultiFields,
  useFormData,
  Field,
  FieldHook,
  FieldConfig,
} from '../../../../../../shared_imports';

interface InternalNetworkTypes {
  internal_networks: string[];
  internal_networks_field: string;
}

type InternalNetworkFields = {
  [K in keyof InternalNetworkTypes]: FieldHook<InternalNetworkTypes[K]>;
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

const fieldsConfig: FieldsConfig = {
  /* Optional fields config */
  source_ip: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.networkDirection.sourceIpLabel', {
      defaultMessage: 'Source IP (optional)',
    }),
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

const internalNetworkConfig: Record<
  keyof InternalNetworkFields,
  { path: string; config?: FieldConfig<any>; euiFieldProps?: Record<string, any> }
> = {
  internal_networks: {
    path: 'fields.internal_networks',
    euiFieldProps: {
      noSuggestions: false,
      options: internalNetworkValues.map((label) => ({ label })),
    },
    config: {
      type: FIELD_TYPES.COMBO_BOX,
      deserializer: to.arrayOfStrings,
      serializer: from.optionalArrayOfStrings,
      fieldsToValidateOnChange: ['fields.internal_networks', 'fields.internal_networks_field'],
      validations: [
        {
          validator: ({ value, path, formData }) => {
            if (value.length === 0 && formData['fields.internal_networks_field'].length === 0) {
              return {
                err: 'ERR_FIELD_MISSING',
                path,
                message: 'A field value is required.',
              };
            }
          },
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
    },
  },
  internal_networks_field: {
    path: 'fields.internal_networks_field',
    config: {
      type: FIELD_TYPES.TEXT,
      serializer: from.emptyStringToUndefined,
      fieldsToValidateOnChange: ['fields.internal_networks', 'fields.internal_networks_field'],
      validations: [
        {
          validator: ({ value, path, formData }) => {
            if (value.length === 0 && formData['fields.internal_networks'].length === 0) {
              return {
                err: 'ERR_FIELD_MISSING',
                path,
                message: 'A field value is required.',
              };
            }
          },
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
          defaultMessage="Field stating where to read the {field} configuration from."
          values={{
            field: <EuiCode>{'internal_networks'}</EuiCode>,
          }}
        />
      ),
    },
  },
};

export const NetworkDirection: FunctionComponent = () => {
  const [{ fields }] = useFormData({ watch: 'fields.internal_networks_field' });
  const [isCustom, setIsCustom] = useState<boolean | undefined>();

  // On initial render the fields variable is undefined and eventually get loaded
  // with data as the form-lib fields get rendered. Since the state of the UI for the
  // `NetworksFields` depends on that, we need to have an effect that runs only once
  // when the `fields` have been loaded and when the isCustom hasnt been yet set.
  const internalNetworksFieldValue = fields?.internal_networks_field;
  useEffect(() => {
    if (internalNetworksFieldValue && isCustom === undefined) {
      setIsCustom(internalNetworksFieldValue?.length > 0);
    }
  }, [internalNetworksFieldValue, isCustom]);

  return (
    <>
      <UseField
        config={fieldsConfig.source_ip}
        component={Field}
        path="fields.source_ip"
        data-test-subj="sourceIpField"
      />

      <UseField
        config={fieldsConfig.destination_ip}
        component={Field}
        path="fields.destination_ip"
        data-test-subj="destinationIpField"
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
        {({
          internal_networks: internalNetworks,
          internal_networks_field: internalNetworksField,
        }) => {
          const field = isCustom ? internalNetworksField : internalNetworks;
          const configKey: keyof InternalNetworkTypes = isCustom
            ? 'internal_networks_field'
            : 'internal_networks';

          const toggleCustom = (currentField: FieldHook) => () => {
            if (isCustom) {
              currentField.setValue('');
            } else {
              currentField.setValue([]);
            }

            currentField.reset({ resetValue: false });

            setIsCustom(!isCustom);
          };

          return (
            <Field
              field={field}
              euiFieldProps={internalNetworkConfig[configKey].euiFieldProps}
              data-test-subj="networkDirectionField"
              labelAppend={
                <EuiButtonEmpty
                  size="xs"
                  onClick={toggleCustom(field)}
                  data-test-subj="toggleCustomField"
                >
                  {isCustom
                    ? i18n.translate(
                        'xpack.ingestPipelines.pipelineEditor.internalNetworkPredefinedLabel',
                        {
                          defaultMessage: 'Use preset field',
                        }
                      )
                    : i18n.translate(
                        'xpack.ingestPipelines.pipelineEditor.internalNetworkCustomLabel',
                        {
                          defaultMessage: 'Use custom field',
                        }
                      )}
                </EuiButtonEmpty>
              }
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
