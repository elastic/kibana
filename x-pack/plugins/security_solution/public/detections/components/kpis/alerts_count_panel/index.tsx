/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Position } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiPanel } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { isEmpty } from 'lodash/fp';
import uuid from 'uuid';

import styled from 'styled-components';
import { GlobalTimeArgs } from '../../../../common/containers/use_global_time';
import { HeaderSection } from '../../../../common/components/header_section';

import { useQueryAlerts } from '../../../containers/detection_engine/alerts/use_query';
import { InspectButtonContainer } from '../../../../common/components/inspect';

import { getAlertsCountQuery } from './helpers';
import * as i18n from './translations';
import { AlertsCount } from './alerts_count';
import { AlertsCountAggregation } from './types';
import {
  alertsStackByOptions,
  DATA_HEIGHT,
  DEFAULT_STACK_BY,
  PANEL_HEIGHT,
} from '../common/config';
import { AlertsStackByOption } from '../common/types';
import { Filter, esQuery, Query } from '../../../../../../../../src/plugins/data/public';
import { useKibana } from '../../../../common/lib/kibana';

export const DETECTIONS_ALERTS_COUNT_ID = 'detections-alerts-count';

interface AlertsCountPanelProps
  extends Pick<GlobalTimeArgs, 'from' | 'to' | 'setQuery' | 'deleteQuery'> {
  combinedQueries?: string;
  defaultStackByOption?: AlertsStackByOption;
  filters?: Filter[];
  query?: Query;
  legendPosition?: Position;
  signalIndexName: string | null;
  stackByOptions?: AlertsStackByOption[];
  tableHeight?: number;
}

const StyledEuiPanel = styled(EuiPanel)<{ height?: number }>`
  ${({ height }) => (height != null ? `height: ${height}px;` : '')}
`;

const getDefaultStackByOption = (): AlertsStackByOption =>
  alertsStackByOptions.find(({ text }) => text === DEFAULT_STACK_BY) ?? alertsStackByOptions[0];

export const parseCombinedQueries = (query?: string) => {
  try {
    return query != null && !isEmpty(query) ? JSON.parse(query) : {};
  } catch {
    return {};
  }
};

export const buildCombinedQueries = (query?: string) => {
  try {
    return isEmpty(query) ? [] : [parseCombinedQueries(query)];
  } catch {
    return [];
  }
};

export const AlertsCountPanel = memo<AlertsCountPanelProps>(
  ({
    combinedQueries,
    defaultStackByOption = getDefaultStackByOption(),
    deleteQuery,
    filters,
    query,
    from,
    setQuery,
    signalIndexName,
    stackByOptions,
    to,
  }) => {
    // create a unique, but stable (across re-renders) query id
    const uniqueQueryId = useMemo(() => `${DETECTIONS_ALERTS_COUNT_ID}-${uuid.v4()}`, []);
    const [isInspectDisabled, setIsInspectDisabled] = useState(false);
    const [selectedStackByOption, setSelectedStackByOption] = useState<AlertsStackByOption>(
      defaultStackByOption
    );

    const {
      loading: isLoadingAlerts,
      data: alertsData,
      setQuery: setAlertsQuery,
      response,
      request,
      refetch,
    } = useQueryAlerts<{}, AlertsCountAggregation>({
      query: getAlertsCountQuery(
        selectedStackByOption.value,
        from,
        to,
        buildCombinedQueries(combinedQueries)
      ),
      indexName: signalIndexName,
    });

    const kibana = useKibana();

    const setSelectedOptionCallback = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        stackByOptions?.find((co) => co.value === event.target.value) ?? defaultStackByOption
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update alert query when data changes
    useEffect(() => {
      try {
        let converted = null;
        if (combinedQueries != null) {
          converted = parseCombinedQueries(combinedQueries);
        } else {
          converted = esQuery.buildEsQuery(
            undefined,
            query != null ? [query] : [],
            filters?.filter((f) => f.meta.disabled === false) ?? [],
            {
              ...esQuery.getEsQueryConfig(kibana.services.uiSettings),
              dateFormatTZ: undefined,
            }
          );
        }
        setIsInspectDisabled(false);
        setAlertsQuery(
          getAlertsCountQuery(
            selectedStackByOption.value,
            from,
            to,
            !isEmpty(converted) ? [converted] : []
          )
        );
      } catch (e) {
        setIsInspectDisabled(true);
        setAlertsQuery(getAlertsCountQuery(selectedStackByOption.value, from, to, []));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStackByOption.value, from, to, query, filters, combinedQueries]);

    // Add query to inspect button utility
    useEffect(() => {
      if (refetch != null && setQuery != null) {
        setQuery({
          id: uniqueQueryId,
          inspect: {
            dsl: [request],
            response: [response],
          },
          loading: isLoadingAlerts,
          refetch,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setQuery, isLoadingAlerts, alertsData, response, request, refetch]);

    // Delete query from inspect button utility when component unmounts
    useEffect(() => {
      return () => {
        if (deleteQuery) {
          deleteQuery({ id: uniqueQueryId });
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <InspectButtonContainer>
        <StyledEuiPanel height={PANEL_HEIGHT} hasBorder>
          <HeaderSection
            id={uniqueQueryId}
            title={i18n.COUNT_TABLE_TITLE}
            isInspectDisabled={isInspectDisabled}
            titleSize="s"
          >
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                {stackByOptions && (
                  <EuiSelect
                    onChange={setSelectedOptionCallback}
                    options={stackByOptions}
                    prepend={i18n.STACK_BY_LABEL}
                    value={selectedStackByOption.value}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </HeaderSection>
          <AlertsCount
            data={alertsData}
            from={from}
            loading={isLoadingAlerts}
            to={to}
            selectedStackByOption={selectedStackByOption.value}
            height={DATA_HEIGHT}
          />
        </StyledEuiPanel>
      </InspectButtonContainer>
    );
  }
);

AlertsCountPanel.displayName = 'AlertsCountPanel';
