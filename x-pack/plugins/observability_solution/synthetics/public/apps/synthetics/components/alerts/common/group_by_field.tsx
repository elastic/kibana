/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSwitch } from '@elastic/eui';

export const GroupByExpression = ({
  groupByLocation,
  onChange,
}: {
  groupByLocation: boolean;
  onChange: (val: boolean) => void;
}) => {
  return (
    <EuiSwitch
      compressed
      label={i18n.translate('xpack.synthetics.groupByExpression.euiSwitch.groupByLabel', {
        defaultMessage: 'Send alert per location',
      })}
      checked={groupByLocation}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
};
