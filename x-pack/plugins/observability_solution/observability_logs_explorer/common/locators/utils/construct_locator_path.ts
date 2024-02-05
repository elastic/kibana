/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DatasetLocatorParams,
  FilterControls,
  ListFilterControl,
} from '@kbn/deeplinks-observability/locators';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import {
  AvailableControlPanels,
  availableControlsPanels,
  DatasetSelectionPlain,
} from '@kbn/logs-explorer-plugin/common';
import { OBSERVABILITY_LOGS_EXPLORER_APP_ID } from '@kbn/deeplinks-observability';
import {
  OBSERVABILITY_LOGS_EXPLORER_URL_STATE_KEY,
  logsExplorerUrlSchemaV1,
} from '../../url_schema';
import { deepCompactObject } from '../../utils/deep_compact_object';

type ControlsPageState = NonNullable<logsExplorerUrlSchemaV1.UrlSchema['controls']>;

interface LocatorPathConstructionParams {
  datasetSelection: DatasetSelectionPlain;
  locatorParams: DatasetLocatorParams;
  useHash: boolean;
}

export const constructLocatorPath = async (params: LocatorPathConstructionParams) => {
  const {
    datasetSelection,
    locatorParams: { filterControls, filters, query, refreshInterval, timeRange, columns, origin },
    useHash,
  } = params;

  const pageState = logsExplorerUrlSchemaV1.urlSchemaRT.encode(
    deepCompactObject({
      v: 1,
      datasetSelection,
      filters,
      query,
      refreshInterval,
      time: timeRange,
      columns: columns?.map((field) => ({ field })),
      controls: getControlsPageStateFromFilterControlsParams(filterControls ?? {}),
    })
  );

  const path = setStateToKbnUrl(
    OBSERVABILITY_LOGS_EXPLORER_URL_STATE_KEY,
    pageState,
    { useHash, storeInHashQuery: false },
    '/'
  );

  return {
    app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
    path,
    state: {
      ...(origin ? { origin } : {}),
    },
  };
};

const getControlsPageStateFromFilterControlsParams = (
  filterControls: FilterControls
): ControlsPageState => ({
  ...(filterControls.namespace != null
    ? getFilterControlPageStateFromListFilterControlsParams(
        availableControlsPanels.NAMESPACE,
        filterControls.namespace
      )
    : {}),
});

const getFilterControlPageStateFromListFilterControlsParams = (
  controlId: AvailableControlPanels[keyof AvailableControlPanels],
  listFilterControl: ListFilterControl
): ControlsPageState => ({
  [controlId]: {
    mode: listFilterControl.mode,
    selection: {
      type: 'options',
      selectedOptions: listFilterControl.values,
    },
  },
});
