/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiFlexGrid,
  EuiPagination,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_DURATION, ALERT_END } from '@kbn/rule-data-utils';
import React, { useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { statusNameMap } from './const';
import { getAlertFormatters } from '../../../alerting/anomaly_detection_alerts_table/render_cell_value';
import { useMlKibana } from '../../contexts/kibana';
import { useAnomalyExplorerContext } from '../anomaly_explorer_context';
import { getAlertsSummary } from './get_alerts_summary';

const PAGE_SIZE = 3;

export const AlertsSummary: React.FC = () => {
  const {
    services: { fieldFormats },
  } = useMlKibana();
  const { anomalyDetectionAlertsStateService } = useAnomalyExplorerContext();

  const alertsData = useObservable(anomalyDetectionAlertsStateService.anomalyDetectionAlerts$, []);
  const formatter = getAlertFormatters(fieldFormats);

  const [activePage, setActivePage] = useState(0);

  const sortedAlertsByRule = useMemo(() => {
    return getAlertsSummary(alertsData);
  }, [alertsData]);

  const pageItems = useMemo(() => {
    return sortedAlertsByRule.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE);
  }, [activePage, sortedAlertsByRule]);

  return (
    <>
      <EuiFlexGrid columns={3} gutterSize={'m'}>
        {pageItems.map(([ruleName, ruleSummary]) => {
          return (
            <EuiFlexItem key={ruleName} grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle size={'xs'}>
                    <h5>{ruleName}</h5>
                  </EuiTitle>
                </EuiFlexItem>
                {ruleSummary.activeCount > 0 ? (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="accent">{statusNameMap.active}</EuiBadge>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>

              <EuiDescriptionList
                compressed
                type="column"
                listItems={[
                  {
                    title: i18n.translate('xpack.ml.explorer.alertsPanel.summary.totalAlerts', {
                      defaultMessage: 'Total alerts: ',
                    }),
                    description: ruleSummary.totalCount,
                  },
                  ...(ruleSummary.activeCount > 0
                    ? [
                        {
                          title: i18n.translate('xpack.ml.explorer.alertsPanel.summary.startedAt', {
                            defaultMessage: 'Started at: ',
                          }),
                          description: formatter(ALERT_END, ruleSummary.startedAt),
                        },
                      ]
                    : [
                        {
                          title: i18n.translate(
                            'xpack.ml.explorer.alertsPanel.summary.recoveredAt',
                            {
                              defaultMessage: 'Recovered at: ',
                            }
                          ),
                          description: formatter(ALERT_END, ruleSummary.recoveredAt),
                        },
                      ]),
                  {
                    title: i18n.translate('xpack.ml.explorer.alertsPanel.summary.lastDuration', {
                      defaultMessage: 'Last duration: ',
                    }),
                    description: formatter(ALERT_DURATION, ruleSummary.lastDuration),
                  },
                ]}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
      {sortedAlertsByRule.length > PAGE_SIZE ? (
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiPagination
              aria-label={i18n.translate(
                'xpack.ml.explorer.alertsPanel.summary.paginationAreaLabel',
                {
                  defaultMessage: 'Pagination for alerting rules summary',
                }
              )}
              pageCount={Math.ceil(sortedAlertsByRule.length / PAGE_SIZE)}
              activePage={activePage}
              onPageClick={setActivePage}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </>
  );
};
