/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { DataViewBase } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { TableId } from '@kbn/securitysolution-data-table';
import { StatefulEventsViewer } from '../../../../common/components/events_viewer';
import { defaultRowRenderers } from '../../../../timelines/components/timeline/body/renderers';
import * as i18n from './translations';
import { isNoisy } from './helpers';
import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';

import { getAlertsPreviewDefaultModel } from '../../../../detections/components/alerts_table/default_config';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { DetailsPanel } from '../../../../timelines/components/side_panel';
import { PreviewRenderCellValue } from './preview_table_cell_renderer';
import { getPreviewTableControlColumn } from './preview_table_control_columns';
import { useGlobalFullScreen } from '../../../../common/containers/use_full_screen';
import type { TimeframePreviewOptions } from '../../../../detections/pages/detection_engine/rules/types';
import { useLicense } from '../../../../common/hooks/use_license';
import { useKibana } from '../../../../common/lib/kibana';
import { getRulePreviewLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/alerts/rule_preview';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';
import { useVisualizationResponse } from '../../../../common/components/visualization_actions/use_visualization_response';
import { INSPECT_ACTION } from '../../../../common/components/visualization_actions/use_actions';

const FullScreenContainer = styled.div<{ $isFullScreen: boolean }>`
  height: ${({ $isFullScreen }) => ($isFullScreen ? '100%' : undefined)};
  flex: 1 1 auto;
  display: flex;
  width: 100%;
`;

export const ID = 'previewHistogram';

const CHART_HEIGHT = 150;

interface PreviewHistogramProps {
  previewId: string;
  addNoiseWarning: () => void;
  spaceId: string;
  ruleType: Type;
  indexPattern: DataViewBase | undefined;
  timeframeOptions: TimeframePreviewOptions;
}

const DEFAULT_HISTOGRAM_HEIGHT = 300;

const PreviewHistogramComponent = ({
  previewId,
  addNoiseWarning,
  spaceId,
  ruleType,
  indexPattern,
  timeframeOptions,
}: PreviewHistogramProps) => {
  const { uiSettings } = useKibana().services;
  const startDate = useMemo(
    () => timeframeOptions.timeframeStart.toISOString(),
    [timeframeOptions]
  );
  const endDate = useMemo(() => timeframeOptions.timeframeEnd.toISOString(), [timeframeOptions]);
  // It seems like the Table/Grid component uses end date value as a non-inclusive one,
  // thus the alerts which have timestamp equal to the end date value are not displayed in the table.
  // To fix that, we extend end date value by 1s to make sure all alerts are included in the table.
  const extendedEndDate = useMemo(
    () => timeframeOptions.timeframeEnd.clone().add('1', 's').toISOString(),
    [timeframeOptions]
  );
  const isEqlRule = useMemo(() => ruleType === 'eql', [ruleType]);
  const isMlRule = useMemo(() => ruleType === 'machine_learning', [ruleType]);

  const timerange = useMemo(() => ({ from: startDate, to: endDate }), [startDate, endDate]);

  const extraVisualizationOptions = useMemo(
    () => ({
      ruleId: previewId,
      spaceId,
      showLegend: !isEqlRule,
    }),
    [isEqlRule, previewId, spaceId]
  );

  const license = useLicense();
  const { browserFields, runtimeMappings } = useSourcererDataView(SourcererScopeName.detections);

  const { globalFullScreen } = useGlobalFullScreen();
  const previousPreviewId = usePrevious(previewId);
  const previewQueryId = `${ID}-${previewId}`;
  const previewEmbeddableId = `${previewQueryId}-embeddable`;
  const { responses: visualizationResponses } = useVisualizationResponse({
    visualizationId: previewEmbeddableId,
  });

  const totalCount = visualizationResponses?.[0]?.hits?.total ?? 0;

  useEffect(() => {
    if (previousPreviewId !== previewId && totalCount > 0) {
      if (isNoisy(totalCount, timeframeOptions)) {
        addNoiseWarning();
      }
    }
  }, [addNoiseWarning, previewId, previousPreviewId, timeframeOptions, totalCount]);

  const config = getEsQueryConfig(uiSettings);
  const pageFilters = useMemo(() => {
    const filterQuery = buildEsQuery(
      indexPattern,
      [{ query: `kibana.alert.rule.uuid:${previewId}`, language: 'kuery' }],
      [],
      {
        nestedIgnoreUnmapped: true,
        ...config,
        dateFormatTZ: undefined,
      }
    );
    return [
      {
        ...filterQuery,
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'kibana.alert.rule.uuid',
          params: {
            query: previewId,
          },
        },
      },
    ];
  }, [config, indexPattern, previewId]);

  return (
    <>
      <Panel height={DEFAULT_HISTOGRAM_HEIGHT} data-test-subj={'preview-histogram-panel'}>
        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem grow={1}>
            <HeaderSection
              id={previewQueryId}
              title={i18n.QUERY_GRAPH_HITS_TITLE}
              titleSize="xs"
              showInspectButton={false}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <VisualizationEmbeddable
              applyGlobalQueriesAndFilters={false}
              disableOnClickFilter={true}
              enableLegendActions={false}
              extraOptions={extraVisualizationOptions}
              getLensAttributes={getRulePreviewLensAttributes}
              height={CHART_HEIGHT}
              id={previewEmbeddableId}
              inspectTitle={i18n.QUERY_GRAPH_HITS_TITLE}
              scopeId={SourcererScopeName.detections}
              stackByField={ruleType === 'machine_learning' ? 'host.name' : 'event.category'}
              timerange={timerange}
              withActions={INSPECT_ACTION}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <>
              <EuiSpacer />
              <EuiText size="s" color="subdued">
                <p>
                  {isMlRule
                    ? i18n.ML_PREVIEW_HISTOGRAM_DISCLAIMER
                    : i18n.PREVIEW_HISTOGRAM_DISCLAIMER}
                </p>
              </EuiText>
            </>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Panel>
      <EuiSpacer />
      <FullScreenContainer $isFullScreen={globalFullScreen}>
        <StatefulEventsViewer
          pageFilters={pageFilters}
          defaultModel={getAlertsPreviewDefaultModel(license)}
          end={extendedEndDate}
          tableId={TableId.rulePreview}
          leadingControlColumns={getPreviewTableControlColumn(1.5)}
          renderCellValue={PreviewRenderCellValue}
          rowRenderers={defaultRowRenderers}
          start={startDate}
          sourcererScope={SourcererScopeName.detections}
          indexNames={[`${DEFAULT_PREVIEW_INDEX}-${spaceId}`]}
          bulkActions={false}
        />
      </FullScreenContainer>
      <DetailsPanel
        browserFields={browserFields}
        isFlyoutView
        runtimeMappings={runtimeMappings}
        scopeId={TableId.rulePreview}
        isReadOnly
      />
    </>
  );
};

export const PreviewHistogram = React.memo(PreviewHistogramComponent);
PreviewHistogram.displayName = 'PreviewHistogram';
