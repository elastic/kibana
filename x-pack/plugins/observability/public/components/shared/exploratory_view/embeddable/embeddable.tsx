/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { AllSeries, useTheme } from '../../../..';
import { LayerConfig, LensAttributes } from '../configurations/lens_attributes';
import { AppDataType, ReportViewType } from '../types';
import { getLayerConfigs } from '../hooks/use_lens_attributes';
import { LensEmbeddableInput, LensPublicStart, XYState } from '../../../../../../lens/public';
import { OperationTypeComponent } from '../series_editor/columns/operation_type_select';
import { IndexPatternState } from '../hooks/use_app_index_pattern';
import { ReportConfigMap } from '../contexts/exploratory_view_config';
import { obsvReportConfigMap } from '../obsv_exploratory_view';
import { ActionTypes, useActions } from './use_actions';
import { AddToCaseAction } from '../header/add_to_case_action';
import { ViewMode } from '../../../../../../../../src/plugins/embeddable/common';
import { observabilityFeatureId } from '../../../../../common';
import { SingleMetric } from './single_metric';

export interface ExploratoryEmbeddableProps {
  appId?: 'security' | 'observability';
  appendTitle?: JSX.Element;
  attributes?: AllSeries;
  title: string | JSX.Element;
  showCalculationMethod?: boolean;
  axisTitlesVisibility?: XYState['axisTitlesVisibilitySettings'];
  customHeight?: string | number;
  customLensAttrs?: any;
  customTimeRange?: { from: string; to: string };
  dataTypesIndexPatterns?: Partial<Record<AppDataType, string>>;
  isSingleMetric?: boolean;
  legendIsVisible?: boolean;
  metricIcon?: string;
  metricIconColor?: string;
  metricPostfix?: string;
  onBrushEnd?: (param: { range: number[] }) => void;
  owner: string;
  reportConfigMap?: ReportConfigMap;
  reportType: ReportViewType;
  withActions?: boolean | ActionTypes[];
}

export interface ExploratoryEmbeddableComponentProps extends ExploratoryEmbeddableProps {
  lens: LensPublicStart;
  indexPatterns: IndexPatternState;
}

// eslint-disable-next-line import/no-default-export
export default function Embeddable({
  appId,
  appendTitle,
  attributes = [],
  axisTitlesVisibility,
  customHeight,
  customLensAttrs,
  customTimeRange,
  indexPatterns,
  isSingleMetric = false,
  legendIsVisible,
  lens,
  metricIcon,
  metricIconColor,
  metricPostfix,
  onBrushEnd,
  owner = observabilityFeatureId,
  reportConfigMap = {},
  reportType,
  showCalculationMethod = false,
  title,
  withActions = true,
}: ExploratoryEmbeddableComponentProps) {
  const LensComponent = lens?.EmbeddableComponent;
  const LensSaveModalComponent = lens?.SaveModalComponent;

  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isAddToCaseOpen, setAddToCaseOpen] = useState(false);

  const series = Object.entries(attributes)[0][1];

  const [operationType, setOperationType] = useState(series?.operationType);
  const theme = useTheme();

  const layerConfigs: LayerConfig[] = getLayerConfigs(
    attributes,
    reportType,
    theme,
    indexPatterns,
    { ...reportConfigMap, ...obsvReportConfigMap }
  );

  let lensAttributes;
  try {
    lensAttributes = new LensAttributes(layerConfigs);
    // eslint-disable-next-line no-empty
  } catch (error) {}

  const attributesJSON = customLensAttrs ?? lensAttributes?.getJSON();

  if (typeof axisTitlesVisibility !== 'undefined') {
    (attributesJSON.state.visualization as XYState).axisTitlesVisibilitySettings =
      axisTitlesVisibility;
  }

  if (typeof legendIsVisible !== 'undefined') {
    (attributesJSON.state.visualization as XYState).legend.isVisible = legendIsVisible;
  }

  const actions = useActions({
    withActions,
    attributes,
    reportType,
    appId,
    setIsSaveOpen,
    setAddToCaseOpen,
    lensAttributes: attributesJSON,
    timeRange: customTimeRange ?? series?.time,
  });

  if (!attributesJSON && layerConfigs.length < 1) {
    return null;
  }

  if (!LensComponent) {
    return <EuiText>No lens component</EuiText>;
  }

  return (
    <Wrapper $customHeight={customHeight}>
      <EuiFlexGroup alignItems="center" gutterSize="none">
        {title && (
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
        )}
        {showCalculationMethod && (
          <EuiFlexItem grow={false} style={{ minWidth: 150 }}>
            <OperationTypeComponent
              operationType={operationType}
              onChange={(val) => {
                setOperationType(val);
              }}
            />
          </EuiFlexItem>
        )}
        {appendTitle}
      </EuiFlexGroup>

      {isSingleMetric && (
        <SingleMetric
          metricIcon={metricIcon}
          metricIconColor={metricIconColor}
          metricPostfix={metricPostfix}
        >
          <LensComponent
            id="exploratoryView-singleMetric"
            style={{ height: '100%' }}
            timeRange={customTimeRange ?? series?.time}
            attributes={attributesJSON}
            onBrushEnd={onBrushEnd}
            withDefaultActions={Boolean(withActions)}
            extraActions={actions}
            viewMode={ViewMode.VIEW}
          />
        </SingleMetric>
      )}
      {!isSingleMetric && (
        <LensComponent
          id="exploratoryView"
          style={{ height: '100%' }}
          timeRange={customTimeRange ?? series?.time}
          attributes={attributesJSON}
          onBrushEnd={onBrushEnd}
          withDefaultActions={Boolean(withActions)}
          extraActions={actions}
          viewMode={ViewMode.VIEW}
        />
      )}
      {isSaveOpen && attributesJSON && (
        <LensSaveModalComponent
          initialInput={attributesJSON as unknown as LensEmbeddableInput}
          onClose={() => setIsSaveOpen(false)}
          // if we want to do anything after the viz is saved
          // right now there is no action, so an empty function
          onSave={() => {}}
        />
      )}
      <AddToCaseAction
        lensAttributes={attributesJSON}
        timeRange={customTimeRange ?? series?.time}
        autoOpen={isAddToCaseOpen}
        setAutoOpen={setAddToCaseOpen}
        appId={appId}
        owner={owner}
      />
    </Wrapper>
  );
}

const Wrapper = styled.div<{
  $customHeight?: string | number;
}>`
  height: 100%;
  &&& {
    > :nth-child(2) {
      height: ${(props) =>
        props.$customHeight ? `${props.$customHeight};` : `calc(100% - 32px);`};
    }
    .embPanel--editing {
      border-style: initial !important;
      :hover {
        box-shadow: none;
      }
    }
    .embPanel__title {
      display: none;
    }
    .embPanel__optionsMenuPopover {
      visibility: collapse;
    }

    &&&:hover {
      .embPanel__optionsMenuPopover {
        visibility: visible;
      }
    }
  }
`;
