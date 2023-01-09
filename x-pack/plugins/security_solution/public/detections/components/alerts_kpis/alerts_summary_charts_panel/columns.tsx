/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiHealth, EuiText, EuiProgress } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { capitalize } from 'lodash';
import { ALERT_SEVERITY, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { DefaultDraggable, Content } from '../../../../common/components/draggables';
import {
  DragEffects,
  DraggableWrapper,
} from '../../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../../common/components/drag_and_drop/helpers';
import type { DataProvider } from '../../../../timelines/components/timeline/data_providers/data_provider';
import { IS_OPERATOR } from '../../../../timelines/components/timeline/data_providers/data_provider';
import { SEVERITY_COLOR } from '../../../../overview/components/detection_response/utils';
import { FormattedCount } from '../../../../common/components/formatted_number';
import * as i18n from './translations';
import type { DetectionsData, AlertType, HostData } from './types';
import type { SeverityBuckets as SeverityData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import { ALERTS_HEADERS_RULE } from '../../alerts_table/translations';
import { EVENT_TYPE_COLOUR } from './helpers';
import { Provider } from '../../../../timelines/components/timeline/data_providers/provider';

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
    name: i18n.COUNT_COULMN_TITLE,
    sortable: true,
    dataType: 'number',
    'data-test-subj': 'severityTable-alertCount',
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
    name: ALERTS_HEADERS_RULE,
    'data-test-subj': 'detectionsTable-rule',
    render: (rule: string) => (
      <EuiText grow={false} size="xs">
        <DefaultDraggable
          isDraggable={false}
          field={ALERT_RULE_NAME}
          hideTopN={true}
          id={`alert-detection-draggable-${rule}`}
          value={rule}
          queryValue={rule}
          tooltipContent={null}
        />
      </EuiText>
    ),
  },
  {
    field: 'type',
    name: i18n.DETECTIONS_TYPE_COLUMN_TITLE,
    'data-test-subj': 'detectionsTable-type',
    render: (type: string) => {
      const dataProvider = {
        and: [],
        enabled: true,
        id: escapeDataProviderId(`alert-detection-draggable-${type}`),
        name: type,
        excluded: type === 'Detection' ? true : false,
        kqlQuery: '',
        queryMatch: {
          field: 'event.type',
          value: 'denied',
          operator: IS_OPERATOR,
          displayValue: type === 'Detection' ? 'Detection' : 'Prevention',
        },
      };

      return (
        <EuiHealth color={EVENT_TYPE_COLOUR[type as AlertType]}>
          <EuiText grow={false} size="xs">
            {/* <DefaultDraggable
            isDraggable={false}
            field={"event.type"}
            hideTopN={true}
            id={`alert-detection-draggable-${type}`}
            value={type}
            queryValue={type == 'Detection' ? "denied" : "denied"}
            tooltipContent={null}
          /> */}
            <DraggableWrapper
              dataProvider={dataProvider as DataProvider}
              isAggregatable={true}
              fieldType={'keyword'}
              render={(_, __, snapshot) =>
                snapshot.isDragging ? (
                  <DragEffects>
                    <Provider dataProvider={dataProvider as DataProvider} />
                  </DragEffects>
                ) : (
                  <Content field={'event.type'} value={type} />
                )
              }
              hideTopN
            />
          </EuiText>
        </EuiHealth>
      );
    },
  },
  {
    field: 'value',
    name: i18n.COUNT_COULMN_TITLE,
    dataType: 'number',
    sortable: true,
    'data-test-subj': 'detectionsTable-count',
    render: (count: number) => (
      <EuiText grow={false} size="xs">
        <FormattedCount count={count} />
      </EuiText>
    ),
    width: '20%',
  },
];

export const getHostTableColumns = (): Array<EuiBasicTableColumn<HostData>> => [
  {
    name: i18n.HOST_TITLE,
    'data-test-subj': 'hostTable-host',
    render: ({ key, value, percentage }: { key: string; value: number; percentage: number }) => (
      <span style={{ width: 400 }}>
        <EuiProgress
          max={100}
          color={`vis9`}
          size="s"
          valueText={true}
          value={percentage}
          label={
            <DefaultDraggable
              isDraggable={false}
              field={'host.name'}
              hideTopN={true}
              id={`alert-host-table-${key}`}
              value={key}
              queryValue={key}
              tooltipContent={null}
            />
          }
        />
      </span>
    ),
  },
  {
    field: 'value',
    name: i18n.COUNT_COULMN_TITLE,
    dataType: 'number',
    'data-test-subj': 'hostTable-count',
    sortable: true,
    render: (count: number) => (
      <EuiText grow={false} size="xs">
        <FormattedCount count={count} />
      </EuiText>
    ),
    width: '23%',
  },
];
