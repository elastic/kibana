/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './chart_switch.scss';
import React, { ReactNode } from 'react';
import { EuiFlexItem, EuiIconTip, EuiBetaBadge, EuiText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { DimensionButton, DimensionTrigger } from '@kbn/visualization-ui-components';
import { euiThemeVars } from '@kbn/ui-theme';
import { FramePublicAPI, VisualizationMap, DatasourceMap, Suggestion } from '../../../../types';

export const ConfigPreview = ({
  dataLoss,
  suggestion,
  framePublicAPI,
  id,
  datasourceMap,
  visualizationMap,
}: {
  dataLoss: 'nothing' | 'layers' | 'everything' | 'columns';
  framePublicAPI: FramePublicAPI;
  id: string;
  datasourceMap: DatasourceMap;
  suggestion?: Suggestion;
  visualizationMap: VisualizationMap;
}) => {
  if (dataLoss === 'nothing') {
    return null;
  }
  if (dataLoss === 'everything' || !suggestion) {
    return (
      <DataLossWarning
        content={i18n.translate('xpack.lens.chartSwitch.dataLossEverything', {
          defaultMessage: 'Selecting this visualization clears the current configuration.',
        })}
        id={id}
      />
    );
  }

  const datasource = suggestion.datasourceId ? datasourceMap[suggestion.datasourceId] : undefined;
  const columnLabelMap = datasource?.uniqueLabels?.(
    suggestion.datasourceState,
    framePublicAPI.dataViews.indexPatterns
  );
  const groups = visualizationMap[suggestion.visualizationId].getConfiguration({
    state: suggestion.visualizationState,
    frame: framePublicAPI,
    layerId: suggestion.keptLayerIds[0],
  }).groups;

  const preview = groups
    .filter((g) => g.accessors.length !== 0)
    .map((group) => {
      return (
        <EuiFormRow
          fullWidth
          label={group.groupLabel}
          labelType="legend"
          key={group.groupId}
          css={css`
            background: ${euiThemeVars.euiColorLightestShade};
            padding: ${euiThemeVars.euiSizeS};
            &:first-child {
              border-radius: ${euiThemeVars.euiBorderRadius} ${euiThemeVars.euiBorderRadius} 0 0;
              margin-top: ${euiThemeVars.euiSizeS};
            }
            &:last-child {
              border-radius: 0 0 ${euiThemeVars.euiBorderRadius} ${euiThemeVars.euiBorderRadius};
            }
            &:first-child:last-child {
              border-radius: ${euiThemeVars.euiBorderRadius};
            }
            & + & {
              border-top: ${euiThemeVars.euiBorderThin};
              margin-top: 0;
            }

            margin: 0 !important;
          `}
        >
          <>
            {group.accessors.map((accessor) => (
              <DimensionButton
                accessorConfig={{ columnId: accessor.columnId }}
                label={columnLabelMap?.[accessor.columnId] ?? ''}
                groupLabel={group.groupLabel}
                onClick={() => {}}
                onRemoveClick={() => {}}
                css={css`
                  margin-bottom: 4px;
                  background: ${euiThemeVars.euiColorEmptyShade};
                `}
              >
                <DimensionTrigger label={columnLabelMap?.[accessor.columnId] ?? ''} />
              </DimensionButton>
            ))}
          </>
        </EuiFormRow>
      );
    });

  if (dataLoss === 'layers') {
    return (
      <DataLossWarning
        content={
          <>
            <EuiText size="s">
              {i18n.translate('xpack.lens.chartSwitch.dataLossLayersDescription', {
                defaultMessage: 'Selecting this visualization keeps first layer data only.',
              })}
            </EuiText>
            <EuiText size="s">
              {i18n.translate('xpack.lens.chartSwitch.dataLossLayers', {
                defaultMessage: `New configuration:`,
              })}
              {preview}
            </EuiText>
          </>
        }
        id={id}
      />
    );
  } else {
    return (
      <DataLossWarning
        content={
          <>
            <EuiText size="s">
              {i18n.translate('xpack.lens.chartSwitch.dataLossColumns', {
                defaultMessage: `Selecting this visualization will convert to the following configuration:`,
              })}
              {preview}
            </EuiText>
          </>
        }
        id={id}
      />
    );
  }
};

const DataLossWarning = ({ content, id }: { content: ReactNode; id: string }) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiIconTip
        size="s"
        aria-label={i18n.translate('xpack.lens.chartSwitch.dataLossLabel', {
          defaultMessage: 'Warning',
        })}
        type="dot"
        color="warning"
        content={content}
        iconProps={{
          className: 'lnsChartSwitch__chartIcon',
          'data-test-subj': `lnsChartSwitchPopoverAlert_${id}`,
        }}
      />
    </EuiFlexItem>
  );
};

export const ExperimentalBadge = () => {
  return (
    <EuiFlexItem grow={false}>
      <EuiBetaBadge
        css={css`
          vertical-align: middle;
        `}
        iconType="beaker"
        label={i18n.translate('xpack.lens.chartSwitch.experimentalLabel', {
          defaultMessage: 'Technical preview',
        })}
        size="s"
      />
    </EuiFlexItem>
  );
};
