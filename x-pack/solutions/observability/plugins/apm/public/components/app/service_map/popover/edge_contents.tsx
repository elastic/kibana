/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from '../../../../../common/es_fields/apm';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import type { ContentsProps } from './popover_content';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { StatsList } from './stats_list';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { OpenInDiscover } from '../../../shared/links/discover_links/open_in_discover';
import { useApmIndexSettingsContext } from '../../../../context/apm_index_settings/use_apm_index_settings_context';
import { isEdge } from './utils';

type EdgeReturn = APIReturnType<'GET /internal/apm/service-map/dependency'>;

const INITIAL_STATE: Partial<EdgeReturn> = {
  currentPeriod: undefined,
  previousPeriod: undefined,
};

export function EdgeContents({ selection, environment, start, end }: ContentsProps) {
  const { query } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );
  const { offset, comparisonEnabled, rangeFrom, rangeTo, kuery } = query;

  const isEdgeSelection = isEdge(selection);
  const { indexSettings, indexSettingsStatus } = useApmIndexSettingsContext();
  const edgeSelectionData = isEdgeSelection ? selection.data : undefined;

  const sourceData = edgeSelectionData?.sourceData;
  const targetData = edgeSelectionData?.targetData;
  const dependencies = edgeSelectionData?.resources;

  const sourceServiceName =
    sourceData && SERVICE_NAME in sourceData ? sourceData[SERVICE_NAME] : undefined;
  const dependencyName =
    targetData && SPAN_DESTINATION_SERVICE_RESOURCE in targetData
      ? targetData[SPAN_DESTINATION_SERVICE_RESOURCE]
      : undefined;

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (sourceServiceName && dependencies && dependencies.length > 0) {
        return callApmApi('GET /internal/apm/service-map/dependency', {
          params: {
            query: {
              sourceServiceName,
              dependencies,
              environment,
              start,
              end,
              offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
            },
          },
        });
      }
    },
    [environment, sourceServiceName, dependencies, start, end, offset, comparisonEnabled]
  );

  const isLoading = status === FETCH_STATUS.LOADING;

  if (!isEdgeSelection) {
    return null;
  }

  return (
    <>
      <EuiFlexItem>
        <StatsList data={data} isLoading={isLoading} />
      </EuiFlexItem>
      {sourceServiceName && dependencyName && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexItem>
            <OpenInDiscover
              dataTestSubj="apmEdgeContentsOpenInDiscoverButton"
              variant="outlinedButton"
              indexType="traces"
              label={i18n.translate('xpack.apm.serviceMap.edgeContents.openInDiscover', {
                defaultMessage: 'Explore traces',
              })}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              indexSettings={indexSettings}
              indexSettingsStatus={indexSettingsStatus}
              queryParams={{
                kuery,
                serviceName: sourceServiceName,
                environment,
                dependencyName,
              }}
            />
          </EuiFlexItem>
        </>
      )}
    </>
  );
}
