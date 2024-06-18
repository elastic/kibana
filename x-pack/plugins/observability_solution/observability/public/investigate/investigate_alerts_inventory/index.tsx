/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLink, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getEsFilterFromGlobalParameters,
  GlobalWidgetParameters,
  OnWidgetAdd,
} from '@kbn/investigate-plugin/public';
import { parseTechnicalFields } from '@kbn/rule-registry-plugin/common';
import {
  AlertConsumers,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_GROUP_FIELD,
  ALERT_GROUP_VALUE,
  ALERT_REASON,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_NAME,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_TIME_RANGE,
  ALERT_UUID,
  ECS_VERSION,
  EVENT_ACTION,
  EVENT_KIND,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { compact, uniqBy } from 'lodash';
import moment from 'moment';
import React, { useEffect, useRef, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { observabilityFeatureId } from '../../../common';
import { asAbsoluteDateTime, TimeUnit } from '../../../common/utils/formatters';
import { fetchAlert } from '../../hooks/use_fetch_alert_detail';
import { useKibana } from '../../utils/kibana_react';
import { createInvestigateAlertsDetailWidget } from '../investigate_alerts_detail/create_investigate_alerts_detail_widget';

const INVENTORY_ALERTS_TABLE_CONFIG = 'inventory';

function RelativeTime({ time, timeUnit = 'minutes' }: { time: number; timeUnit?: TimeUnit }) {
  const momentTime = moment(time);
  const relativeTimeLabel = momentTime.fromNow();
  const absoluteTimeLabel = asAbsoluteDateTime(time, timeUnit);

  return (
    <EuiToolTip content={absoluteTimeLabel}>
      <>{relativeTimeLabel}</>
    </EuiToolTip>
  );
}

export function InvestigateAlertsInventory({
  filters,
  query,
  timeRange,
  onWidgetAdd,
  relatedAlertUuid,
  activeOnly,
}: GlobalWidgetParameters & {
  onWidgetAdd: OnWidgetAdd;
  relatedAlertUuid?: string;
  activeOnly?: boolean;
}) {
  const {
    triggersActionsUi: { getAlertsStateTable: AlertsStateTable, alertsTableConfigurationRegistry },
    http,
    dataViews,
  } = useKibana().services;

  const onWidgetAddRef = useRef(onWidgetAdd);

  onWidgetAddRef.current = onWidgetAdd;

  const abortControllerRef = useRef(new AbortController());

  const esQueryAsync = useAsync(async () => {
    const esFilter = getEsFilterFromGlobalParameters({
      filters,
      query,
      timeRange: undefined,
    });

    // make sure there is no upper limit for @timestamp
    esFilter.bool.filter.push({
      range: {
        [ALERT_TIME_RANGE]: {
          gte: timeRange.from,
          lte: timeRange.to,
        },
      },
    });

    if (relatedAlertUuid) {
      const alert = await fetchAlert(
        {
          id: relatedAlertUuid,
        },
        abortControllerRef.current,
        http
      );

      const alertFields = await dataViews.getFieldsForWildcard({
        pattern: alert._index,
        allowHidden: true,
        allowNoIndex: true,
        includeEmptyFields: false,
      });

      const allowlistedKibanaFields: string[] = [
        ALERT_GROUP_FIELD,
        ALERT_GROUP_VALUE,
        ALERT_REASON,
        ALERT_RULE_DESCRIPTION,
        ALERT_RULE_NAME,
      ];

      const blocklistedTechnicalFields: string[] = [EVENT_ACTION, EVENT_KIND, ECS_VERSION];

      const allowedFields = alertFields
        .filter((field) => {
          const isTextOrKeyword =
            field.esTypes?.includes('text') || field.esTypes?.includes('keyword');

          if (!isTextOrKeyword) {
            return false;
          }

          const isKibanaField = field.name.startsWith('kibana.');

          if (isKibanaField) {
            return allowlistedKibanaFields.includes(field.name);
          }

          return !blocklistedTechnicalFields.includes(field.name);
        })
        .map((field) => field.name);

      if (alert) {
        esFilter.bool.filter.push({
          more_like_this: {
            fields: allowedFields,
            like: [{ _index: alert._index, _id: alert[ALERT_UUID] as unknown as string }],
            min_term_freq: 1,
          },
        });
      }
    }

    if (activeOnly) {
      esFilter.bool.filter.push({
        term: {
          [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
        },
      });
    }

    return esFilter;
  }, [filters, query, timeRange, activeOnly, relatedAlertUuid, http, dataViews]);

  const [alertsTableConfigurationLoading, setAlertsTableConfigurationLoading] = useState(true);

  useEffect(() => {
    const intervalId = setInterval(checkIfObservabilityTableConfigHasLoaded, 250);

    function clear() {
      clearInterval(intervalId);
    }

    function checkIfObservabilityTableConfigHasLoaded() {
      if (alertsTableConfigurationRegistry.has(INVENTORY_ALERTS_TABLE_CONFIG)) {
        setAlertsTableConfigurationLoading(false);
        return clear();
      }
      if (alertsTableConfigurationRegistry.has(observabilityFeatureId)) {
        const observabilityAlertsTableConfig =
          alertsTableConfigurationRegistry.get(observabilityFeatureId);

        const columnsToRemove = [ALERT_EVALUATION_THRESHOLD, ALERT_EVALUATION_VALUE, 'tags'];

        const columns = observabilityAlertsTableConfig.columns
          .filter((column) => !columnsToRemove.includes(column.id))
          .map((column) => {
            if (column.id === ALERT_START) {
              return {
                ...column,
                initialWidth: 96,
              };
            }
            return column;
          });

        const statusColumn = observabilityAlertsTableConfig.columns.find(
          (column) => column.id === ALERT_STATUS
        );

        const reasonColumn = observabilityAlertsTableConfig.columns.find(
          (column) => column.id === ALERT_REASON
        );

        const startedColumn = observabilityAlertsTableConfig.columns.find(
          (column) => column.id === ALERT_START
        );

        const columnsInOrder = uniqBy(
          compact([statusColumn, startedColumn, reasonColumn, ...columns]),
          (column) => column.id
        );

        alertsTableConfigurationRegistry.register({
          ...observabilityAlertsTableConfig,
          id: INVENTORY_ALERTS_TABLE_CONFIG,
          showInspectButton: false,
          columns: columnsInOrder,
          useActionsColumn: undefined,
          hideBulkActions: true,
          useCellActions: () => {
            return {
              getCellActions: () => [],
            };
          },
          getRenderCellValue: (props) => {
            const values = (props.data as Array<{ field: string; value: unknown[] }>).find(
              (fieldValuePair) => fieldValuePair.field === props.columnId
            )?.value;

            if (props.columnId === ALERT_REASON) {
              const index = props.rowIndex % props.pagination.pageSize;

              const alert = parseTechnicalFields(props.alerts[index]);
              return (
                <EuiLink
                  data-test-subj="investigateAlertsInventoryAlertReasonLink"
                  onClick={() => {
                    onWidgetAddRef.current(
                      createInvestigateAlertsDetailWidget({
                        title: i18n.translate(
                          'xpack.observability.investigateAlertsInventory.alertDetailWidgetTitle',
                          {
                            defaultMessage: `Alert: {ruleName}`,
                            values: {
                              ruleName: alert[ALERT_RULE_NAME],
                            },
                          }
                        ),
                        parameters: {
                          alertUuid: alert[ALERT_UUID],
                        },
                      })
                    );
                  }}
                >
                  {values?.[0]}
                </EuiLink>
              );
            }

            if (props.columnType === 'datetime') {
              const time = values?.[0] as string | undefined;

              if (typeof time === 'string') {
                return <RelativeTime time={new Date(time).getTime()} />;
              }
            }
            const { getRenderCellValue } = observabilityAlertsTableConfig;

            // @ts-expect-error Type 'ComponentClass<CellPropsWithContext, any>' has no call signatures.
            return getRenderCellValue?.(props);
          },
        });
        setAlertsTableConfigurationLoading(false);
        return clear();
      }
    }
    return clear;
  }, [alertsTableConfigurationRegistry]);

  if (alertsTableConfigurationLoading || !esQueryAsync.value) {
    return <EuiLoadingSpinner />;
  }

  return (
    <AlertsStateTable
      alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
      id={'investigate-alerts-inventory'}
      configurationId={INVENTORY_ALERTS_TABLE_CONFIG}
      featureIds={[
        AlertConsumers.APM,
        AlertConsumers.INFRASTRUCTURE,
        AlertConsumers.LOGS,
        AlertConsumers.ML,
        AlertConsumers.MONITORING,
        AlertConsumers.OBSERVABILITY,
        AlertConsumers.SLO,
        AlertConsumers.SLO,
        AlertConsumers.STACK_ALERTS,
        AlertConsumers.UPTIME,
      ]}
      query={esQueryAsync.value}
      showAlertStatusWithFlapping
      emptyStateHeight="short"
    />
  );
}
