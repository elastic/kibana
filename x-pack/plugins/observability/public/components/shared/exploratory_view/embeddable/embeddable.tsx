/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Position } from '@elastic/charts';
import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import {
  FormulaPublicApi,
  LensEmbeddableInput,
  LensPublicStart,
  XYState,
} from '@kbn/lens-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/common';
import { SingleMetricLensAttributes } from '../configurations/lens_attributes/single_metric_attributes';
import { AllSeries, ReportTypes, useTheme } from '../../../..';
import { LayerConfig, LensAttributes } from '../configurations/lens_attributes';
import { AppDataType, ReportViewType } from '../types';
import { getLayerConfigs } from '../hooks/use_lens_attributes';
import { OperationTypeComponent } from '../series_editor/columns/operation_type_select';
import { DataViewState } from '../hooks/use_app_data_view';
import { ReportConfigMap } from '../contexts/exploratory_view_config';
import { obsvReportConfigMap } from '../obsv_exploratory_view';
import { ActionTypes, useActions } from './use_actions';
import { AddToCaseAction } from '../header/add_to_case_action';
import { observabilityFeatureId } from '../../../../../common';
import { SingleMetric, SingleMetricOptions } from './single_metric';

export interface ExploratoryEmbeddableProps {
  appId?: 'securitySolutionUI' | 'observability';
  appendTitle?: JSX.Element;
  attributes?: AllSeries;
  axisTitlesVisibility?: XYState['axisTitlesVisibilitySettings'];
  customHeight?: string | number;
  customLensAttrs?: any; // Takes LensAttributes
  customTimeRange?: { from: string; to: string }; // requred if rendered with LensAttributes
  dataTypesIndexPatterns?: Partial<Record<AppDataType, string>>;
  isSingleMetric?: boolean;
  legendIsVisible?: boolean;
  legendPosition?: Position;
  hideTicks?: boolean;
  onBrushEnd?: (param: { range: number[] }) => void;
  caseOwner?: string;
  reportConfigMap?: ReportConfigMap;
  reportType: ReportViewType;
  showCalculationMethod?: boolean;
  singleMetricOptions?: SingleMetricOptions;
  title?: string | JSX.Element;
  withActions?: boolean | ActionTypes[];
  align?: 'left' | 'right' | 'center';
}

export interface ExploratoryEmbeddableComponentProps extends ExploratoryEmbeddableProps {
  lens: LensPublicStart;
  indexPatterns: DataViewState;
  lensFormulaHelper?: FormulaPublicApi;
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
  legendPosition,
  lens,
  onBrushEnd,
  caseOwner = observabilityFeatureId,
  reportConfigMap = {},
  reportType,
  showCalculationMethod = false,
  singleMetricOptions,
  title,
  withActions = true,
  lensFormulaHelper,
  align,
  hideTicks,
}: ExploratoryEmbeddableComponentProps) {
  const LensComponent = lens?.EmbeddableComponent;
  const LensSaveModalComponent = lens?.SaveModalComponent;

  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isAddToCaseOpen, setAddToCaseOpen] = useState(false);

  const series = Object.entries(attributes)[0]?.[1];

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
    if (reportType === ReportTypes.SINGLE_METRIC) {
      lensAttributes = new SingleMetricLensAttributes(layerConfigs, reportType, lensFormulaHelper!);
    } else {
      lensAttributes = new LensAttributes(layerConfigs, reportType, lensFormulaHelper);
    }
    // eslint-disable-next-line no-empty
  } catch (error) {}

  const attributesJSON = customLensAttrs ?? lensAttributes?.getJSON();
  const timeRange = customTimeRange ?? series?.time;
  if (typeof axisTitlesVisibility !== 'undefined') {
    (attributesJSON.state.visualization as XYState).axisTitlesVisibilitySettings =
      axisTitlesVisibility;
  }

  if (typeof legendIsVisible !== 'undefined') {
    (attributesJSON.state.visualization as XYState).legend.isVisible = legendIsVisible;
  }
  if (typeof legendPosition !== 'undefined') {
    (attributesJSON.state.visualization as XYState).legend.position = legendPosition;
  }

  if (hideTicks) {
    (attributesJSON.state.visualization as XYState).tickLabelsVisibilitySettings = {
      x: false,
      yRight: false,
      yLeft: false,
    };
  }

  const actions = useActions({
    withActions,
    attributes,
    reportType,
    appId,
    setIsSaveOpen,
    setAddToCaseOpen,
    lensAttributes: attributesJSON,
    timeRange,
  });

  if (!attributesJSON && layerConfigs.length < 1) {
    return null;
  }

  if (!LensComponent) {
    return <EuiText>No lens component</EuiText>;
  }

  return (
    <Wrapper $customHeight={customHeight} align={align}>
      <EuiFlexGroup alignItems="center" gutterSize="none">
        {title && (
          <EuiFlexItem data-test-subj="exploratoryView-title">
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
        {appendTitle && appendTitle}
      </EuiFlexGroup>

      {isSingleMetric && (
        <SingleMetric {...singleMetricOptions}>
          <LensComponent
            id="exploratoryView-singleMetric"
            data-test-subj="exploratoryView-singleMetric"
            style={{ height: '100%' }}
            timeRange={timeRange}
            attributes={attributesJSON}
            onBrushEnd={onBrushEnd}
            withDefaultActions={Boolean(withActions)}
            extraActions={actions}
            viewMode={ViewMode.VIEW}
            executionContext={{
              type: 'observability_exploratory_view_embeddable',
            }}
          />
        </SingleMetric>
      )}
      {!isSingleMetric && (
        <LensComponent
          id="exploratoryView"
          data-test-subj="exploratoryView"
          style={{ height: '100%' }}
          timeRange={timeRange}
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
        owner={caseOwner}
      />
    </Wrapper>
  );
}

const Wrapper = styled.div<{
  $customHeight?: string | number;
  align?: 'left' | 'right' | 'center';
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
    .expExpressionRenderer__expression {
      padding-top: 0;
    }

    &&&:hover {
      .embPanel__optionsMenuPopover {
        visibility: visible;
      }
    }
    .legacyMtrVis > :first-child {
      justify-content: ${(props) =>
        props.align === 'left' ? `flex-start;` : props.align === 'right' ? `flex-end;` : 'center;'};
      .legacyMtrVis__container {
        padding-top: 4px;
        padding-left: ${(props) => (props.align === 'left' ? `0` : '16px;')};
        padding-right: ${(props) => (props.align === 'right' ? `0` : '16px;')};
      }
      > :first-child {
        transform: none !important;
      }
    }
  }
`;
