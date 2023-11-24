/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetLocatorParams, ExtraControlOption } from '@kbn/deeplinks-observability/locators';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import { availableControlsPanels, DatasetSelectionPlain } from '@kbn/log-explorer-plugin/common';
import {
  OBSERVABILITY_LOG_EXPLORER_APP_ID,
  OBSERVABILITY_LOG_EXPLORER_URL_STATE_KEY,
} from '../../constants';
import { urlSchemaV1 } from '../../url_schema';
import { deepCompactObject } from '../../utils/deep_compact_object';

interface LocatorPathConstructionParams {
  datasetSelection: DatasetSelectionPlain;
  locatorParams: DatasetLocatorParams;
  useHash: boolean;
}

export const constructLocatorPath = async (params: LocatorPathConstructionParams) => {
  const {
    datasetSelection,
    locatorParams: { extraControls, filters, query, refreshInterval, timeRange, columns, origin },
    useHash,
  } = params;

  const pageState = urlSchemaV1.urlSchemaRT.encode(
    deepCompactObject({
      v: 1,
      datasetSelection,
      filters,
      query,
      refreshInterval,
      time: timeRange,
      columns: columns?.map((field) => ({ field })),
      controls: getControlsPageStateFromExtraControlsParams(extraControls ?? []),
    })
  );

  const path = setStateToKbnUrl(
    OBSERVABILITY_LOG_EXPLORER_URL_STATE_KEY,
    pageState,
    { useHash, storeInHashQuery: false },
    '/'
  );

  return {
    app: OBSERVABILITY_LOG_EXPLORER_APP_ID,
    path,
    state: {
      ...(origin ? { origin } : {}),
    },
  };
};

const getControlsPageStateFromExtraControlsParams = (extraControlOptions: ExtraControlOption[]) => {
  return extraControlOptions.reduce<NonNullable<urlSchemaV1.UrlSchema['controls']>>(
    (controlsPageState, extraControlOption) => {
      if (extraControlOption.type === 'simple-include-namespaces') {
        controlsPageState[availableControlsPanels.NAMESPACE] = {
          mode: 'include',
          selection: {
            type: 'options',
            selectedOptions: extraControlOption.namespaces,
          },
        };
      }

      return controlsPageState;
    },
    {}
  );
};
