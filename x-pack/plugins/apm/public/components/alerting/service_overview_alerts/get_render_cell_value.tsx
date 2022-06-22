/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLink } from '@elastic/eui';
import {
  asDuration,
  asAbsoluteDateTime,
} from '../../../../common/utils/formatters';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_START,
  ALERT_REASON,
  TIMESTAMP,
  ALERT_DURATION,
} from '@kbn/rule-data-utils';
import type {
  CellValueElementProps,
  TimelineNonEcsData,
} from '@kbn/timelines-plugin/common';
import { Maybe } from '../../../../typings/common';

export const getValue = (value: Maybe<string[]>) => {
  if (value != null && value.length) {
    return value[0];
  }
  return undefined;
};

const parseAlert = ({ data }: { data: TimelineNonEcsData[] }) => {
  const parsedFields = data.reduce(
    (acc, d) => ({ ...acc, [d.field]: getValue(d.value) }),
    {}
  );
  return {
    fields: parsedFields,
    active: parsedFields[ALERT_STATUS] === ALERT_STATUS_ACTIVE,
    start: new Date(parsedFields[ALERT_START] ?? 0).getTime(),
    lastUpdated: new Date(parsedFields[TIMESTAMP] ?? 0).getTime(),
  };
};
export const getRenderCellValue = ({
  setFlyoutAlert,
}: {
  setFlyoutAlert: (data) => void;
}) => {
  return ({ columnId, data }: CellValueElementProps) => {
    const alert = parseAlert({ data });
    const value = alert.fields[columnId];

    switch (columnId) {
      case ALERT_DURATION:
        return asDuration(Number(value));
      case TIMESTAMP:
        return asAbsoluteDateTime(value);
      case ALERT_REASON:
        return (
          <EuiLink
            href=""
            onClick={() => setFlyoutAlert && setFlyoutAlert(alert)}
          >
            {value}
          </EuiLink>
        );
      default:
        return <>{value}</>;
    }
  };
};
