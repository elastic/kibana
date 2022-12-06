/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import moment from 'moment';
import { RuleAlertingOutcome } from '@kbn/alerting-plugin/common';
import { useSpacesData } from '../../../../common/lib/kibana';
import { RuleEventLogListStatus } from './actions_connectors_log_list_status';
import { RuleDurationFormat } from '../../rules_list/components/rule_duration_format';
import {
  CONNECTOR_EXECUTION_LOG_COLUMN_IDS,
  RULE_EXECUTION_LOG_DURATION_COLUMNS,
} from '../../../constants';

export const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

export type ColumnId = typeof CONNECTOR_EXECUTION_LOG_COLUMN_IDS[number];

interface ConnectorEventLogListCellRendererProps {
  columnId: ColumnId;
  version?: string;
  value?: string | string[];
  dateFormat?: string;
  ruleId?: string;
  spaceIds?: string[];
  useExecutionStatus?: boolean;
}

export const ConnectorEventLogListCellRenderer = (
  props: ConnectorEventLogListCellRendererProps
) => {
  const { columnId, value, dateFormat = DEFAULT_DATE_FORMAT, useExecutionStatus = true } = props;
  const spacesData = useSpacesData();

  const activeSpace = useMemo(
    () => spacesData?.spacesMap.get(spacesData?.activeSpaceId),
    [spacesData]
  );

  if (typeof value === 'undefined') {
    return null;
  }

  if (columnId === 'status') {
    return (
      <RuleEventLogListStatus
        status={value as RuleAlertingOutcome}
        useExecutionStatus={useExecutionStatus}
      />
    );
  }

  if (columnId === 'timestamp') {
    return <>{moment(value).format(dateFormat)}</>;
  }

  if (columnId === 'space_ids') {
    if (activeSpace && value.includes(activeSpace.id)) return <>{activeSpace.name}</>;
    if (spacesData) return <>{spacesData.spacesMap.get(value[0])?.name ?? value[0]}</>;
  }

  if (RULE_EXECUTION_LOG_DURATION_COLUMNS.includes(columnId)) {
    return <RuleDurationFormat duration={parseInt(value as string, 10)} />;
  }

  return <>{value}</>;
};
