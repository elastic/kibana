/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { IconType } from '@elastic/eui';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import { NetworkRouteType } from '../../../network/pages/navigation/types';
import { APP_ID, SecurityPageName } from '../../../../common/constants';
import { filterHostExternalAlertData, filterNetworkExternalAlertData } from './utils';
import { StartServices } from '../../../types';
import { TypedLensByValueInput } from '../../../../../lens/public';
import { ActionTypes, ReportViewType, SeriesUrl } from '../../../../../observability/public';

export interface SingleMetricOptions {
  alignLnsMetric?: string;
  disableBorder?: boolean;
  disableShadow?: boolean;
  metricIcon?: IconType;
  metricIconColor?: string;
  metricIconWidth?: string;
  metricPostfix?: string;
  metricPostfixWidth?: string;
}

type AppId = 'securitySolutionUI' | 'observability';

const configs = {
  alignLnsMetric: 'flex-start',
  appId: 'securitySolutionUI' as AppId,
  attributes: [{ dataType: 'security' }] as unknown as SeriesUrl[],
  disableBorder: true,
  disableShadow: true,
  customHeight: '100%',
  isSingleMetric: true,
  owner: APP_ID,
  reportType: 'kpi-over-time' as ReportViewType,
  withActions: ['save', 'addToCase', 'openInLens'] as ActionTypes[],
};

interface EmbeddableHistogramProps {
  appendTitle?: JSX.Element;
  customLensAttrs: TypedLensByValueInput['attributes'];
  customTimeRange: { from: string; to: string };
  isSingleMetric: boolean;
  onBrushEnd?: (param: { range: number[] }) => void;
  title?: string | JSX.Element;
  singleMetricOptions?: SingleMetricOptions;
}

export const EmbeddableHistogram = (props: EmbeddableHistogramProps) => {
  const { observability } = useKibana<StartServices>().services;
  const ExploratoryViewEmbeddable = observability.ExploratoryViewEmbeddable;
  const { dataViewId, selectedPatterns } = useSourcererDataView();
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const { tabName } = useParams<{ tabName: string }>();

  const tabsFilters = useMemo(() => {
    if (location.pathname.includes(SecurityPageName.hosts) && tabName === 'externalAlerts') {
      return filters.length > 0
        ? [...filters, ...filterHostExternalAlertData]
        : filterHostExternalAlertData;
    }

    if (
      location.pathname.includes(SecurityPageName.network) &&
      tabName === NetworkRouteType.alerts
    ) {
      return filters.length > 0
        ? [...filters, ...filterNetworkExternalAlertData]
        : filterNetworkExternalAlertData;
    }

    return filters;
  }, [tabName, filters]);

  const customLensAttrs = useMemo(() => {
    const cfg = props.customLensAttrs;
    return {
      ...cfg,
      state: { ...cfg.state, query, filters: [...cfg.state.filters, ...tabsFilters] },
      references: cfg.references.map((ref) => ({ ...ref, id: dataViewId })),
    };
  }, [props.customLensAttrs, query, tabsFilters, dataViewId]);

  const mergedProps = {
    ...configs,
    ...props,
    indexPatterns: selectedPatterns.join(','),
    customLensAttrs,
  };
  return <ExploratoryViewEmbeddable {...mergedProps} />;
};

EmbeddableHistogram.displayName = 'EmbeddableHistogram';
