/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import React, { memo, useMemo, useState, useEffect } from 'react';
import uuid from 'uuid';

import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { HeaderSection } from '../../../../common/components/header_section';

import { useQueryAlerts } from '../../../containers/detection_engine/alerts/use_query';
import { InspectButtonContainer } from '../../../../common/components/inspect';

import { getAlertsCountQuery } from './helpers';
import * as i18n from './translations';
import { AlertsCount } from './alerts_count';
import type { AlertsCountAggregation } from './types';
import { DEFAULT_STACK_BY_FIELD } from '../common/config';
import { KpiPanel, StackByComboBox } from '../common/components';
import { useInspectButton } from '../common/hooks';

export const DETECTIONS_ALERTS_COUNT_ID = 'detections-alerts-count';

interface AlertsCountPanelProps {
  filters?: Filter[];
  query?: Query;
  signalIndexName: string | null;
  runtimeMappings?: MappingRuntimeFields;
}

export const AlertsCountPanel = memo<AlertsCountPanelProps>(
  ({ filters, query, signalIndexName, runtimeMappings }) => {
    const { to, from, deleteQuery, setQuery } = useGlobalTime();

    // create a unique, but stable (across re-renders) query id
    const uniqueQueryId = useMemo(() => `${DETECTIONS_ALERTS_COUNT_ID}-${uuid.v4()}`, []);
    const [selectedStackByOption, setSelectedStackByOption] = useState(DEFAULT_STACK_BY_FIELD);

    // TODO: Once we are past experimental phase this code should be removed
    // const fetchMethod = useIsExperimentalFeatureEnabled('ruleRegistryEnabled')
    //   ? fetchQueryRuleRegistryAlerts
    //   : fetchQueryAlerts;

    // Disabling the fecth method in useQueryAlerts since it is defaulted to the old one
    // const fetchMethod = fetchQueryRuleRegistryAlerts;

    const additionalFilters = useMemo(() => {
      try {
        return [
          buildEsQuery(
            undefined,
            query != null ? [query] : [],
            filters?.filter((f) => f.meta.disabled === false) ?? []
          ),
        ];
      } catch (e) {
        return [];
      }
    }, [query, filters]);

    const {
      loading: isLoadingAlerts,
      data: alertsData,
      setQuery: setAlertsQuery,
      response,
      request,
      refetch,
    } = useQueryAlerts<{}, AlertsCountAggregation>({
      query: getAlertsCountQuery(
        selectedStackByOption,
        from,
        to,
        additionalFilters,
        runtimeMappings
      ),
      indexName: signalIndexName,
    });

    useEffect(() => {
      setAlertsQuery(
        getAlertsCountQuery(selectedStackByOption, from, to, additionalFilters, runtimeMappings)
      );
    }, [setAlertsQuery, selectedStackByOption, from, to, additionalFilters, runtimeMappings]);

    useInspectButton({
      setQuery,
      response,
      request,
      refetch,
      uniqueQueryId,
      deleteQuery,
      loading: isLoadingAlerts,
    });

    return (
      <InspectButtonContainer>
        <KpiPanel hasBorder data-test-subj="alertsCountPanel">
          <HeaderSection
            id={uniqueQueryId}
            title={i18n.COUNT_TABLE_TITLE}
            titleSize="s"
            hideSubtitle
          >
            <StackByComboBox selected={selectedStackByOption} onSelect={setSelectedStackByOption} />
          </HeaderSection>
          <AlertsCount
            data={alertsData}
            loading={isLoadingAlerts}
            selectedStackByOption={selectedStackByOption}
          />
        </KpiPanel>
      </InspectButtonContainer>
    );
  }
);

AlertsCountPanel.displayName = 'AlertsCountPanel';
