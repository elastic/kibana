/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { Frequency } from '@kbn/es-ui-shared-plugin/public/components/cron_editor/types';

import { Connector } from '../../../../common/types/connectors';

import { CronEditor } from './cron_editor';

interface Props {
  disabled?: boolean;
  onChange(scheduling: Connector['scheduling']): void;
  scheduling: Connector['scheduling'];
}

export const EnterpriseSearchCronEditor: React.FC<Props> = ({ disabled, onChange, scheduling }) => {
  const [fieldToPreferredValueMap, setFieldToPreferredValueMap] = useState({});
  const [simpleCron, setSimpleCron] = useState<{
    expression: string;
    frequency: Frequency;
  }>({
    expression: scheduling?.interval ?? '',
    frequency: scheduling?.interval ? cronToFrequency(scheduling.interval) : 'HOUR',
  });

  return (
    <CronEditor
      fieldToPreferredValueMap={fieldToPreferredValueMap}
      cronExpression={simpleCron.expression}
      frequency={simpleCron.frequency}
      disabled={disabled}
      onChange={({
        cronExpression: expression,
        frequency,
        fieldToPreferredValueMap: newFieldToPreferredValueMap,
      }) => {
        setSimpleCron({
          expression,
          frequency,
        });
        setFieldToPreferredValueMap(newFieldToPreferredValueMap);
        onChange({ ...scheduling, interval: expression });
      }}
      frequencyBlockList={['MINUTE']}
    />
  );
};

function cronToFrequency(cron: string): Frequency {
  const fields = cron.split(' ');
  if (fields.length < 4) {
    return 'YEAR';
  }
  if (fields[1] === '*') {
    return 'MINUTE';
  }
  if (fields[2] === '*') {
    return 'HOUR';
  }
  if (fields[3] === '*') {
    return 'DAY';
  }
  if (fields[4] === '?') {
    return 'WEEK';
  }
  if (fields[4] === '*') {
    return 'MONTH';
  }
  return 'YEAR';
}
