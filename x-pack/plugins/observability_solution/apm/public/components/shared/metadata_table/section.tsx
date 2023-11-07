/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { KeyValueTable } from '../key_value_table';

interface Props {
  properties: Array<{ field: string; value: string[] | number[] }>;
}

export function Section({ properties }: Props) {
  if (!isEmpty(properties)) {
    return (
      <KeyValueTable
        keyValuePairs={properties.map((property) => ({
          key: property.field,
          value: property.value,
        }))}
      />
    );
  }
  return (
    <EuiText size="s">
      {i18n.translate(
        'xpack.apm.propertiesTable.agentFeature.noDataAvailableLabel',
        { defaultMessage: 'No data available' }
      )}
    </EuiText>
  );
}
