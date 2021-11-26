/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiLink, EuiText } from '@elastic/eui';

import {
  FIELD_TYPES,
  UseField,
  useFormContext,
  Field,
  FieldHook,
  FieldConfig,
  SerializerFunc,
} from '../../../../../../shared_imports';
import { FieldsConfig, from, to } from './shared';
import { TargetField } from './common_fields/target_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';

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

const getInternalNetworkConfig: (toggleCustom: () => void) => Record<
  keyof InternalNetworkFields,
  {
    path: string;
    config?: FieldConfig<any>;
    euiFieldProps?: Record<string, any>;
    labelAppend: JSX.Element;
  }
> = (toggleCustom: () => void) => ({
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
            if (isEmpty(value) && isEmpty(formData['fields.internal_networks_field'])) {
              return { path, message: 'A field value is required.' };
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
    labelAppend: (
      <EuiText size="xs">
        <EuiLink onClick={toggleCustom} data-test-subj="toggleCustomField">
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.internalNetworkCustomLabel"
            defaultMessage="Use custom field"
          />
        </EuiLink>
      </EuiText>
    ),
    key: 'preset',
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
            if (isEmpty(value) && isEmpty(formData['fields.internal_networks'])) {
              return { path, message: 'A field value is required.' };
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
    labelAppend: (
      <EuiText size="xs">
        <EuiLink onClick={toggleCustom} data-test-subj="toggleCustomField">
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.internalNetworkPredefinedLabel"
            defaultMessage="Use preset field"
          />
        </EuiLink>
      </EuiText>
    ),
    key: 'custom',
  },
});

export const NetworkDirection: FunctionComponent = () => {
  const { getFieldDefaultValue } = useFormContext();
  const isInternalNetowrksFieldDefined =
    getFieldDefaultValue('fields.internal_networks_field') !== undefined;
  const [isCustom, setIsCustom] = useState<boolean>(isInternalNetowrksFieldDefined);

  const toggleCustom = useCallback(() => {
    setIsCustom((prev) => !prev);
  }, []);

  const internalNetworkFieldProps = useMemo(
    () =>
      isCustom
        ? getInternalNetworkConfig(toggleCustom).internal_networks_field
        : getInternalNetworkConfig(toggleCustom).internal_networks,
    [isCustom, toggleCustom]
  );

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

      <UseField
        {...internalNetworkFieldProps}
        component={Field}
        data-test-subj="networkDirectionField"
      />

      <IgnoreMissingField
        defaultValue={true}
        serializer={from.undefinedIfValue(true) as SerializerFunc<boolean>}
      />
    </>
  );
};
