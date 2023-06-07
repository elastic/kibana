/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';

import { get } from 'lodash';
import {
  ComboBoxField,
  FIELD_TYPES,
  UseField,
  Field,
  useFormContext,
} from '../../../../../../shared_imports';

import { FieldsConfig, to, from } from './shared';

const fieldsConfig: FieldsConfig = {
  /* Optional field configs */
  destination: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.reroute.destinationFieldLabel', {
      defaultMessage: 'Destination (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.reroute.destinationFieldHelperText"
        defaultMessage="A static value for the target. Cannot be set when {dataset} or {namespace} is set."
        values={{
          dataset: <EuiCode>{'dataset'}</EuiCode>,
          namespace: <EuiCode>{'namespace'}</EuiCode>,
        }}
      />
    ),
  },
  dataset: {
    defaultValue: null,
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    serializer: from.optionalArrayOfStrings,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.reroute.datasetFieldLabel', {
      defaultMessage: 'Dataset (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.reroute.datasetFieldHelperText"
        defaultMessage="Field references or a static value for the dataset part of the data stream name. In addition to the criteria for index names, cannot contain {dash} and must be no longer than 100 characters. Defaults to {defaultValue}."
        values={{
          dash: <EuiCode>{'-'}</EuiCode>,
          defaultValue: <EuiCode>{'{{data_stream.dataset}}'}</EuiCode>,
        }}
      />
    ),
  },
  namespace: {
    defaultValue: null,
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    serializer: from.optionalArrayOfStrings,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.reroute.namespaceFieldLabel', {
      defaultMessage: 'Namespace (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.reroute.namespaceFieldHelperText"
        defaultMessage="Field references or a static value for the namespace part of the data stream name. Should meet the criteria for index names and must be no longer than 100 characters. Defaults to {defaultValue}."
        values={{ defaultValue: <EuiCode>{'{{data_stream.namespace}}'}</EuiCode> }}
      />
    ),
  },
};

export const Reroute: FunctionComponent = () => {
  const form = useFormContext();
  const [isDestinationDisabled, setIsDestinationDisabled] = useState<boolean>(false);
  useEffect(() => {
    const subscription = form.subscribe(({ data: { internal } }) => {
      const hasDatasetValues = get(internal, 'fields.dataset').length !== 0;
      const hasNamespaceValues = get(internal, 'fields.namespace').length !== 0;
      if ((hasDatasetValues || hasNamespaceValues) && !isDestinationDisabled) {
        setIsDestinationDisabled(true);
        form.getFields()['fields.destination'].setValue('');
      } else if (!(hasDatasetValues || hasNamespaceValues) && isDestinationDisabled) {
        setIsDestinationDisabled(false);
      }
    });
    return subscription.unsubscribe;
  }, [form, isDestinationDisabled]);

  return (
    <>
      <UseField
        data-test-subj="destinationField"
        config={fieldsConfig.destination}
        component={Field}
        componentProps={{
          euiFieldProps: {
            disabled: isDestinationDisabled,
          },
        }}
        path="fields.destination"
      />

      <UseField
        data-test-subj="datasetField"
        config={fieldsConfig.dataset}
        component={ComboBoxField}
        path="fields.dataset"
      />

      <UseField
        data-test-subj="namespaceField"
        config={fieldsConfig.namespace}
        component={ComboBoxField}
        path="fields.namespace"
      />
    </>
  );
};
