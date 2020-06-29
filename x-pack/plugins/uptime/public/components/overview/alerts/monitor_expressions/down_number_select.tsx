/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { AlertExpressionPopover } from '../alert_expression_popover';
import * as labels from '../translations';
import { AlertFieldNumber } from '../alert_field_number';

interface Props {
  defaultNumTimes?: number;
  hasFilters: boolean;
  setAlertParams: (key: string, value: any) => void;
}

export const DownNoExpressionSelect: React.FC<Props> = ({
  defaultNumTimes,
  hasFilters,
  setAlertParams,
}) => {
  const [numTimes, setNumTimes] = useState<number>(defaultNumTimes ?? 5);

  useEffect(() => {
    setAlertParams('numTimes', numTimes);
  }, [numTimes, setAlertParams]);

  return (
    <AlertExpressionPopover
      aria-label={labels.OPEN_THE_POPOVER_DOWN_COUNT}
      content={
        <AlertFieldNumber
          aria-label={labels.ENTER_NUMBER_OF_DOWN_COUNTS}
          data-test-subj="xpack.uptime.alerts.monitorStatus.numTimesField"
          disabled={false}
          fieldValue={numTimes}
          setFieldValue={setNumTimes}
        />
      }
      data-test-subj="xpack.uptime.alerts.monitorStatus.numTimesExpression"
      description={hasFilters ? labels.MATCHING_MONITORS_DOWN : labels.ANY_MONITOR_DOWN}
      id="ping-count"
      value={`${numTimes} times`}
    />
  );
};
