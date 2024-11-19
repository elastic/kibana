/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { fieldSupportsBreakdown } from '@kbn/field-utils';
import { DEFAULT_LOGS_DATA_VIEW } from '../../common/constants';
import { useCreateDataView } from './use_create_dataview';
import { useKibanaContextForPlugin } from '../utils';
import { useDatasetQualityDetailsState } from './use_dataset_quality_details_state';
import { getLensAttributes as getDegradedLensAttributes } from '../components/dataset_quality_details/overview/document_trends/degraded_docs/lens_attributes';
import { getLensAttributes as getFailedLensAttributes } from '../components/dataset_quality_details/overview/document_trends/failed_docs/lens_attributes';
import { useRedirectLink } from './use_redirect_link';
import { useDatasetDetailsTelemetry } from './use_dataset_details_telemetry';
import { useDatasetDetailsRedirectLinkTelemetry } from './use_redirect_link_telemetry';

const exploreDataInLogsExplorerText = i18n.translate(
  'xpack.datasetQuality.details.chartExploreDataInLogsExplorerText',
  {
    defaultMessage: 'Explore data in Logs Explorer',
  }
);

const exploreDataInDiscoverText = i18n.translate(
  'xpack.datasetQuality.details.chartExploreDataInDiscoverText',
  {
    defaultMessage: 'Explore data in Discover',
  }
);

const openInLensText = i18n.translate('xpack.datasetQuality.details.chartOpenInLensText', {
  defaultMessage: 'Open in Lens',
});

const ACTION_EXPLORE_IN_LOGS_EXPLORER = 'ACTION_EXPLORE_IN_LOGS_EXPLORER';
const ACTION_OPEN_IN_LENS = 'ACTION_OPEN_IN_LENS';
const DEGRADED_DOCS_KUERY = `_ignored:*`;

export type QualityIssue = 'degradedDocs' | 'failedDocs';

export const useQualityIssuesDocsChart = (qualityIssue: QualityIssue) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { lens },
  } = useKibanaContextForPlugin();
  const {
    service,
    dataStream,
    datasetDetails,
    timeRange,
    breakdownField,
    integrationDetails,
    isBreakdownFieldAsserted,
  } = useDatasetQualityDetailsState();

  const {
    trackDatasetDetailsBreakdownFieldChanged,
    trackDetailsNavigated,
    navigationTargets,
    navigationSources,
  } = useDatasetDetailsTelemetry();

  const [isChartLoading, setIsChartLoading] = useState<boolean | undefined>(undefined);
  const [attributes, setAttributes] = useState<
    ReturnType<typeof getDegradedLensAttributes | typeof getFailedLensAttributes> | undefined
  >(undefined);

  const query = qualityIssue === 'degradedDocs' ? DEGRADED_DOCS_KUERY : '';

  const { dataView } = useCreateDataView({
    indexPatternString: getDataViewIndexPattern(dataStream),
  });

  const breakdownDataViewField = useMemo(
    () => getDataViewField(dataView, breakdownField),
    [breakdownField, dataView]
  );

  const handleChartLoading = (isLoading: boolean) => {
    setIsChartLoading(isLoading);
  };

  const handleBreakdownFieldChange = useCallback(
    (field: DataViewField | undefined) => {
      service.send({
        type: 'BREAKDOWN_FIELD_CHANGE',
        breakdownField: field?.name,
      });
    },
    [service]
  );

  useEffect(() => {
    if (isBreakdownFieldAsserted) trackDatasetDetailsBreakdownFieldChanged();
  }, [trackDatasetDetailsBreakdownFieldChanged, isBreakdownFieldAsserted]);

  useEffect(() => {
    // TODO: Fix dataStreamName for accesing failure store (::failures)
    const dataStreamName = dataStream ?? DEFAULT_LOGS_DATA_VIEW;
    const datasetTitle =
      integrationDetails?.integration?.datasets?.[datasetDetails.name] ?? datasetDetails.name;

    const lensAttributes =
      qualityIssue === 'degradedDocs'
        ? getDegradedLensAttributes({
            color: euiTheme.colors.danger,
            dataStream: dataStreamName,
            datasetTitle,
            breakdownFieldName: breakdownDataViewField?.name,
          })
        : getFailedLensAttributes({
            color: euiTheme.colors.danger,
            dataStream: dataStreamName,
            datasetTitle,
            breakdownFieldName: breakdownDataViewField?.name,
          });
    setAttributes(lensAttributes);
  }, [
    qualityIssue,
    breakdownDataViewField?.name,
    euiTheme.colors.danger,
    setAttributes,
    dataStream,
    integrationDetails?.integration?.datasets,
    datasetDetails.name,
  ]);

  const openInLensCallback = useCallback(() => {
    if (attributes) {
      trackDetailsNavigated(navigationTargets.Lens, navigationSources.Chart);
      lens.navigateToPrefilledEditor({
        id: '',
        timeRange,
        attributes,
      });
    }
  }, [
    attributes,
    lens,
    navigationSources.Chart,
    navigationTargets.Lens,
    timeRange,
    trackDetailsNavigated,
  ]);

  const getOpenInLensAction = useMemo(() => {
    return {
      id: ACTION_OPEN_IN_LENS,
      type: 'link',
      order: 17,
      getDisplayName(): string {
        return openInLensText;
      },
      getIconType(): string {
        return 'visArea';
      },
      async isCompatible(): Promise<boolean> {
        return true;
      },
      async execute(): Promise<void> {
        return openInLensCallback();
      },
    };
  }, [openInLensCallback]);

  const { sendTelemetry } = useDatasetDetailsRedirectLinkTelemetry({
    query: { language: 'kuery', query },
    navigationSource: navigationSources.Chart,
  });

  const redirectLinkProps = useRedirectLink({
    dataStreamStat: datasetDetails,
    query: { language: 'kuery', query },
    timeRangeConfig: timeRange,
    breakdownField: breakdownDataViewField?.name,
    sendTelemetry,
  });

  const getOpenInLogsExplorerAction = useMemo(() => {
    return {
      id: ACTION_EXPLORE_IN_LOGS_EXPLORER,
      type: 'link',
      getDisplayName(): string {
        return redirectLinkProps?.isLogsExplorerAvailable
          ? exploreDataInLogsExplorerText
          : exploreDataInDiscoverText;
      },
      getHref: async () => {
        return redirectLinkProps.linkProps.href;
      },
      getIconType(): string | undefined {
        return 'visTable';
      },
      async isCompatible(): Promise<boolean> {
        return true;
      },
      async execute(): Promise<void> {
        return redirectLinkProps.navigate();
      },
      order: 18,
    };
  }, [redirectLinkProps]);

  const extraActions: Action[] = [getOpenInLensAction, getOpenInLogsExplorerAction];

  const breakdown = useMemo(() => {
    return {
      dataViewField: breakdownDataViewField,
      fieldSupportsBreakdown: breakdownDataViewField
        ? fieldSupportsBreakdown(breakdownDataViewField)
        : true,
      onChange: handleBreakdownFieldChange,
    };
  }, [breakdownDataViewField, handleBreakdownFieldChange]);

  return {
    attributes,
    dataView,
    breakdown,
    extraActions,
    isChartLoading,
    redirectLinkProps,
    onChartLoading: handleChartLoading,
    setAttributes,
    setIsChartLoading,
  };
};

// TODO: Fix dataView for accesing failure store (::failures)
function getDataViewIndexPattern(dataStream: string | undefined) {
  return dataStream ?? DEFAULT_LOGS_DATA_VIEW;
}

function getDataViewField(dataView: DataView | undefined, fieldName: string | undefined) {
  return fieldName && dataView
    ? dataView.fields.find((field) => field.name === fieldName)
    : undefined;
}
