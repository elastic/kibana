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
import { SecurityPageName } from '../../../../common/constants';
import { filterHostExternalAlertData, filterNetworkExternalAlertData } from './utils';

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

const configs = {
  alignLnsMetric: 'flex-start',
  appId: 'securitySolutionUI',
  attributes: [
    {
      dataType: 'security',
    },
  ],
  disableBorder: true,
  disableShadow: true,
  customHeight: '100%',
  isSingleMetric: true,
  owner: 'securitySolution',
  reportType: 'singleMetric',
  withActions: ['save', 'addToCase', 'openInLens'],
};

interface EmbeddableHistogramProps {
  appendTitle?: JSX.Element;
  customLensAttrs: {};
  customTimeRange: { from: string; to: string };
  isSingleMetric: boolean;
  onBrushEnd?: (param: { range: number[] }) => void;
  title?: string | JSX.Element;
  singleMetricOptions?: SingleMetricOptions;
}

export const EmbeddableHistogram = (props: EmbeddableHistogramProps) => {
  const { observability } = useKibana<StartServices>().services;
  const ExploratoryViewEmbeddable = observability.ExploratoryViewEmbeddable;
  const { patternList, dataViewId } = useSourcererDataView();
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

  const indexPatterns = patternList?.join(',');

  const mergedProps = { ...configs, ...props, indexPatterns, customLensAttrs };
  return <ExploratoryViewEmbeddable {...mergedProps} />;
};

EmbeddableHistogram.displayName = 'EmbeddableHistogram';
