/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FieldsConfig, from } from './shared';
import { TargetField } from './common_fields/target_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import {
  Field,
  UseField,
  useFormData,
  FIELD_TYPES,
  NumericField,
  SerializerFunc,
  fieldFormatters,
  fieldValidators,
} from '../../../../../../shared_imports';

const SEED_MIN_VALUE = 0;
const SEED_MAX_VALUE = 65535;

const seedValidator = {
  max: fieldValidators.numberSmallerThanField({
    than: SEED_MAX_VALUE,
    allowEquality: true,
    message: i18n.translate('xpack.ingestPipelines.pipelineEditor.communityId.seedMaxNumberError', {
      defaultMessage: `This number must be equal or less than {maxValue}.`,
      values: { maxValue: SEED_MAX_VALUE },
    }),
  }),
  min: fieldValidators.numberGreaterThanField({
    than: SEED_MIN_VALUE,
    allowEquality: true,
    message: i18n.translate('xpack.ingestPipelines.pipelineEditor.communityId.seedMinNumberError', {
      defaultMessage: `This number must be equal or greater than {minValue}.`,
      values: { minValue: SEED_MIN_VALUE },
    }),
  }),
};

const fieldsConfig: FieldsConfig = {
  source_ip: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.communityId.sourceIpLabel', {
      defaultMessage: 'Source IP (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.communityId.sourceIpHelpText"
        defaultMessage="Field containing the source IP address. Defaults to {defaultValue}."
        values={{ defaultValue: <EuiCode>{'source.ip'}</EuiCode> }}
      />
    ),
  },
  source_port: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.communityId.sourcePortLabel', {
      defaultMessage: 'Source port (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.communityId.sourcePortHelpText"
        defaultMessage="Field containing the source port. Defaults to {defaultValue}."
        values={{ defaultValue: <EuiCode>{'source.port'}</EuiCode> }}
      />
    ),
  },
  destination_ip: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.communityId.destinationIpLabel', {
      defaultMessage: 'Destination IP (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.communityId.destinationIpHelpText"
        defaultMessage="Field containing the destination IP address. Defaults to {defaultValue}."
        values={{ defaultValue: <EuiCode>{'destination.ip'}</EuiCode> }}
      />
    ),
  },
  destination_port: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.communityId.destinationPortLabel', {
      defaultMessage: 'Destination port (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.communityId.destinationPortHelpText"
        defaultMessage="Field containing the destination port. Defaults to {defaultValue}."
        values={{ defaultValue: <EuiCode>{'destination.port'}</EuiCode> }}
      />
    ),
  },
  icmp_type: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.communityId.icmpTypeLabel', {
      defaultMessage: 'ICMP type (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.communityId.icmpTypeHelpText"
        defaultMessage="Field containing the destination ICMP type. Defaults to {defaultValue}."
        values={{ defaultValue: <EuiCode>{'icmp.type'}</EuiCode> }}
      />
    ),
  },
  icmp_code: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.communityId.icmpCodeLabel', {
      defaultMessage: 'ICMP code (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.communityId.icmpCodeHelpText"
        defaultMessage="Field containing the ICMP code. Defaults to {defaultValue}."
        values={{ defaultValue: <EuiCode>{'icmp.code'}</EuiCode> }}
      />
    ),
  },
  iana_number: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.communityId.ianaLabel', {
      defaultMessage: 'IANA number (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.communityId.ianaNumberHelpText"
        defaultMessage="Field containing the IANA number. Used only when {field} is not specified. Defaults to {defaultValue}."
        values={{
          field: <EuiCode>{'Transport'}</EuiCode>,
          defaultValue: <EuiCode>{'network.iana_number'}</EuiCode>,
        }}
      />
    ),
  },
  transport: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.communityId.transportLabel', {
      defaultMessage: 'Transport (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.communityId.transportHelpText"
        defaultMessage="Field containing the transport protocol. Used only when {field} is not specified. Defaults to {defaultValue}."
        values={{
          field: <EuiCode>{'IANA number'}</EuiCode>,
          defaultValue: <EuiCode>{'network.transport'}</EuiCode>,
        }}
      />
    ),
  },
  seed: {
    type: FIELD_TYPES.NUMBER,
    formatters: [fieldFormatters.toInt],
    serializer: from.undefinedIfValue(''),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.communityId.seedLabel', {
      defaultMessage: 'Seed (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.communityId.seedHelpText"
        defaultMessage="Seed for the community ID hash. Defaults to {defaultValue}."
        values={{ defaultValue: <EuiCode>{'0'}</EuiCode> }}
      />
    ),
    validations: [
      {
        validator: (field) => {
          if (field.value) {
            return seedValidator.max(field) ?? seedValidator.min(field);
          }
        },
      },
    ],
  },
};

export const CommunityId: FunctionComponent = () => {
  const [{ fields }] = useFormData({ watch: ['fields.iana_number', 'fields.transport'] });

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField
            config={fieldsConfig.source_ip}
            component={Field}
            path="fields.source_ip"
            data-test-subj="sourceIpField"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            config={fieldsConfig.source_port}
            component={Field}
            path="fields.source_port"
            data-test-subj="sourcePortField"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField
            config={fieldsConfig.destination_ip}
            component={Field}
            path="fields.destination_ip"
            data-test-subj="destinationIpField"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            config={fieldsConfig.destination_port}
            component={Field}
            path="fields.destination_port"
            data-test-subj="destinationPortField"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <UseField
        config={fieldsConfig.iana_number}
        component={Field}
        path="fields.iana_number"
        data-test-subj="ianaField"
        componentProps={{
          euiFieldProps: {
            disabled: !!fields?.transport,
          },
        }}
      />
      <UseField
        config={fieldsConfig.transport}
        component={Field}
        path="fields.transport"
        data-test-subj="transportField"
        componentProps={{
          euiFieldProps: {
            disabled: !!fields?.iana_number,
          },
        }}
      />

      <UseField
        config={fieldsConfig.icmp_type}
        component={Field}
        path="fields.icmp_type"
        data-test-subj="icmpTypeField"
      />

      <UseField
        config={fieldsConfig.icmp_code}
        component={Field}
        path="fields.icmp_code"
        data-test-subj="icmpCodeField"
      />

      <UseField
        config={fieldsConfig.seed}
        component={NumericField}
        path="fields.seed"
        data-test-subj="seedField"
        componentProps={{
          euiFieldProps: {
            min: SEED_MIN_VALUE,
            max: SEED_MAX_VALUE,
          },
        }}
      />

      <TargetField
        helpText={
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.communityId.targetFieldHelpText"
            defaultMessage="Output field. Defaults to {field}."
            values={{
              field: <EuiCode>{'network.community_id'}</EuiCode>,
            }}
          />
        }
      />

      <IgnoreMissingField
        defaultValue={true}
        serializer={from.undefinedIfValue(true) as SerializerFunc<boolean>}
      />
    </>
  );
};
