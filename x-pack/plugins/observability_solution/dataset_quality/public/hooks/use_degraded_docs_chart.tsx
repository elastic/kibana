/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from '@kbn/ui-actions-plugin/public';
import { fieldSupportsBreakdown } from '@kbn/unified-histogram-plugin/public';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useEuiTheme } from '@elastic/eui';
import { type DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { DEFAULT_LOGS_DATA_VIEW } from '../../common/constants';
import { indexNameToDataStreamParts } from '../../common/utils';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { getLensAttributes } from '../components/flyout/degraded_docs_trend/lens_attributes';
import { useKibanaContextForPlugin } from '../utils';
import { useCreateDataView } from './use_create_dataview';
import { useDatasetQualityFlyout } from './use_dataset_quality_flyout';
import { useLinkToLogsExplorer } from './use_link_to_logs_explorer';

const exploreDataInLogsExplorerText = i18n.translate(
  'xpack.datasetQuality.flyoutChartExploreDataInLogsExplorerText',
  {
    defaultMessage: 'Explore data in Logs Explorer',
  }
);

const openInLensText = i18n.translate('xpack.datasetQuality.flyoutChartOpenInLensText', {
  defaultMessage: 'Open in Lens',
});

const ACTION_EXPLORE_IN_LOGS_EXPLORER = 'ACTION_EXPLORE_IN_LOGS_EXPLORER';
const ACTION_OPEN_IN_LENS = 'ACTION_OPEN_IN_LENS';

interface DegradedDocsChartDeps {
  dataStream?: string;
  breakdownField?: string;
}

export const useDegradedDocsChart = ({ dataStream }: DegradedDocsChartDeps) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { lens },
  } = useKibanaContextForPlugin();
  const { service } = useDatasetQualityContext();

  const { dataStreamStat, timeRange, breakdownField } = useDatasetQualityFlyout();

  const [isChartLoading, setIsChartLoading] = useState<boolean | undefined>(undefined);
  const [attributes, setAttributes] = useState<ReturnType<typeof getLensAttributes> | undefined>(
    undefined
  );

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
        breakdownField: field?.name ?? null,
      });
    },
    [service]
  );

  useEffect(() => {
    const dataStreamName = dataStream ?? DEFAULT_LOGS_DATA_VIEW;

    const lensAttributes = getLensAttributes({
      color: euiTheme.colors.danger,
      dataStream: dataStreamName,
      datasetTitle: dataStreamStat?.title ?? dataStreamName,
      breakdownFieldName: breakdownDataViewField?.name,
    });
    setAttributes(lensAttributes);
  }, [
    breakdownDataViewField?.name,
    euiTheme.colors.danger,
    setAttributes,
    dataStream,
    dataStreamStat?.title,
  ]);

  const openInLensCallback = useCallback(() => {
    if (attributes) {
      lens.navigateToPrefilledEditor({
        id: '',
        timeRange,
        attributes,
      });
    }
  }, [lens, attributes, timeRange]);

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

  const logsExplorerLinkProps = useLinkToLogsExplorer({
    dataStreamStat: dataStreamStat!,
    query: { language: 'kuery', query: '_ignored:*' },
    timeRangeConfig: timeRange,
    breakdownField: breakdownDataViewField?.name,
  });

  const getOpenInLogsExplorerAction = useMemo(() => {
    return {
      id: ACTION_EXPLORE_IN_LOGS_EXPLORER,
      type: 'link',
      getDisplayName(): string {
        return exploreDataInLogsExplorerText;
      },
      getHref: async () => {
        return logsExplorerLinkProps.href;
      },
      getIconType(): string | undefined {
        return 'popout';
      },
      async isCompatible(): Promise<boolean> {
        return true;
      },
      async execute(): Promise<void> {
        return logsExplorerLinkProps.navigate();
      },
      order: 18,
    };
  }, [logsExplorerLinkProps]);

  const extraActions: Action[] = [getOpenInLensAction, getOpenInLogsExplorerAction];

  return {
    attributes,
    dataView,
    breakdown: {
      dataViewField: breakdownDataViewField,
      fieldSupportsBreakdown: breakdownDataViewField
        ? fieldSupportsBreakdown(breakdownDataViewField)
        : true,
      onChange: handleBreakdownFieldChange,
    },
    extraActions,
    isChartLoading,
    onChartLoading: handleChartLoading,
    setAttributes,
    setIsChartLoading,
  };
};

function getDataViewIndexPattern(dataStream: string | undefined) {
  return dataStream ? `${indexNameToDataStreamParts(dataStream).type}-*-*` : DEFAULT_LOGS_DATA_VIEW;
}

function getDataViewField(dataView: DataView | undefined, fieldName: string | undefined) {
  return fieldName && dataView
    ? dataView.fields.find((field) => field.name === fieldName)
    : undefined;
}
