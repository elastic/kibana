/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiHealth, EuiText } from '@elastic/eui';
import { capitalize } from 'lodash';
import { ALERT_SEVERITY, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type { DetectionsData, AlertType } from './types';
import type { SeverityBuckets as SeverityData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import { DefaultDraggable } from '../../../../common/components/draggables';
import { SEVERITY_COLOR } from '../../../../overview/components/detection_response/utils';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { ALERTS_HEADERS_RULE_NAME } from '../../alerts_table/translations';
import { DETECTION_COLOR } from './helpers';
import {COUNT_TABLE_TITLE} from '../alerts_count_panel/translations';
import * as i18n from './translations';

export const getSeverityTableColumns = (): Array<EuiBasicTableColumn<SeverityData>> => [
  {
    field: 'key',
    name: i18n.SEVERITY_LEVEL_COLUMN_TITLE,
    'data-test-subj': 'severityTable-severity',
    render: (severity: Severity) => (
      <EuiHealth color={SEVERITY_COLOR[severity]} textSize="xs">
        <DefaultDraggable
          isDraggable={false}
          field={ALERT_SEVERITY}
          hideTopN
          id={`alert-severity-draggable-${severity}`}
          value={capitalize(severity)}
          queryValue={severity}
          tooltipContent={null}
        />
      </EuiHealth>
    ),
  },
  {
    field: 'value',
    name: COUNT_TABLE_TITLE,
    sortable: true,
    dataType: 'number',
    'data-test-subj': 'severityTable-alertCount',
    width: '45%',
    render: (alertCount: number) => (
      <EuiText grow={false} size="xs">
        <FormattedCount count={alertCount} />
      </EuiText>
    ),
  },
];

export const getDetectionsTableColumns = (): Array<EuiBasicTableColumn<DetectionsData>> => [
  {
    field: 'rule',
    name: ALERTS_HEADERS_RULE_NAME,
    'data-test-subj': 'detectionsTable-rule',
    // truncateText: true,
    render: (rule: string) => (
      <EuiText size="xs">
      {/* <EuiText size="xs" className="eui-textTruncate" > */}
        <DefaultDraggable
          isDraggable={false}
          field={ALERT_RULE_NAME}
          hideTopN={true}
          id={`alert-detection-draggable-${rule}`}
          value={rule}
          queryValue={rule}
          tooltipContent={null}
          // truncate={true}
        />
      </EuiText>
    ),
  },
  {
    field: 'type',
    name: i18n.ALERTS_TYPE_COLUMN_TITLE,
    'data-test-subj': 'detectionsTable-type',
    truncateText: true,
    render: (type: string) => {
      return (
        <EuiHealth color={DETECTION_COLOR[type as AlertType]}>
          <EuiText grow={false} size="xs">{type}
          </EuiText>
        </EuiHealth>
      );
    },
    width: '30%',
  },
  {
    field: 'value',
    name: COUNT_TABLE_TITLE,
    dataType: 'number',
    sortable: true,
    'data-test-subj': 'detectionsTable-count',
    render: (count: number) => (
      <EuiText grow={false} size="xs">
        <FormattedCount count={count} />
      </EuiText>
    ),
    width: '22%',
  },
];