/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';
import { Action } from '@kbn/ui-actions-plugin/public';

import { i18n } from '@kbn/i18n';
import { DEFAULT_LOGS_DATA_VIEW } from '../../common/constants';
import { indexNameToDataStreamParts } from '../../common/utils';
import { getLensAttributes } from '../components/flyout/degraded_docs_trend/lens_attributes';
import { useCreateDataView } from './use_create_dataview';
import { useLinkToLogsExplorer } from './use_link_to_logs_explorer';
import { useDatasetQualityFlyout } from './use_dataset_quality_flyout';
import { useKibanaContextForPlugin } from '../utils';

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
}

export const useDegradedDocsChart = ({ dataStream }: DegradedDocsChartDeps) => {
  const {
    services: { lens },
  } = useKibanaContextForPlugin();
  const { dataStreamStat, timeRange } = useDatasetQualityFlyout();

  const [isChartLoading, setIsChartLoading] = useState<boolean | undefined>(undefined);
  const [attributes, setAttributes] = useState<ReturnType<typeof getLensAttributes> | undefined>(
    undefined
  );

  const datasetTypeIndexPattern = dataStream
    ? `${indexNameToDataStreamParts(dataStream).type}-*-*`
    : undefined;
  const { dataView } = useCreateDataView({
    indexPatternString: datasetTypeIndexPattern ?? DEFAULT_LOGS_DATA_VIEW,
  });
  const filterQuery = `_index: ${dataStream ?? 'match-none'}`;

  const handleChartLoading = (isLoading: boolean) => {
    setIsChartLoading(isLoading);
  };

  const openInLensCallback = useCallback(() => {
    if (attributes) {
      lens.navigateToPrefilledEditor({
        id: '',
        timeRange,
        attributes,
      });
    }
  }, [lens, attributes, timeRange]);

  const getOpenInLensAction = (): Action => {
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
  };

  const logsExplorerLinkProps = useLinkToLogsExplorer({
    dataStreamStat: dataStreamStat!,
    query: { language: 'kuery', query: '_ignored:*' },
  });

  const getOpenInLogsExplorerAction = (): Action => {
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
  };

  const extraActions: Action[] = [getOpenInLensAction(), getOpenInLogsExplorerAction()];

  return {
    attributes,
    dataView,
    filterQuery,
    extraActions,
    isChartLoading,
    handleChartLoading,
    setAttributes,
    setIsChartLoading,
  };
};
