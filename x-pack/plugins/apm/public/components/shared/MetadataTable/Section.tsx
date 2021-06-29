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
import { KeyValueTable } from '../KeyValueTable';
import { KeyValuePair } from '../../../utils/flattenObject';

interface Props {
  keyValuePairs: KeyValuePair[];
}

export function Section({ keyValuePairs }: Props) {
  if (!isEmpty(keyValuePairs)) {
    return <KeyValueTable keyValuePairs={keyValuePairs} />;
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
