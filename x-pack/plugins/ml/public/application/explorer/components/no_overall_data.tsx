/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export const NoOverallData: FC = () => {
  return (
    <FormattedMessage
      id="xpack.ml.anomalySwimLane.noOverallDataMessage"
      defaultMessage="No anomalies found in the overall bucket results for this time range"
    />
  );
};
