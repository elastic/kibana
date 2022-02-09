/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTitle } from '@elastic/eui';
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

export interface ExploratoryEmbeddableProps {
  alignLnsMetric?: string;
  appId?: 'security' | 'observability';
  appendHeader?: JSX.Element;
  appendTitle?: JSX.Element;
  attributes?: AllSeries;
  axisTitlesVisibility?: XYState['axisTitlesVisibilitySettings'];
  compressed?: boolean;
  customHeight?: string | number;
  customLensAttrs?: any;
  customTimeRange: { from: string; to: string };
  dataTypesIndexPatterns?: Partial<Record<AppDataType, string>>;
  disableBorder?: boolean;
  disableShadow?: boolean;
  legendIsVisible?: boolean;
  metricIcon?: string;
  metricIconColor?: string;
  metricPostfix?: string;
  onBrushEnd?: () => void;
  reportConfigMap?: ReportConfigMap;
  reportType: ReportViewType;
  showCalculationMethod?: boolean;
  title: string | JSX.Element;
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
  alignLnsMetric,
  attributes = [],
  axisTitlesVisibility,
  compressed = false,
  customHeight,
  customLensAttrs,
  customTimeRange,
  disableBorder = false,
  disableShadow = false,
  indexPatterns,
  legendIsVisible,
  lens,
  metricIcon,
  metricIconColor,
  metricPostfix,
  onBrushEnd,
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
    lensAttributes = new LensAttributes(layerConfigs, reportType);
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
    appId,
    attributes,
    lensAttributes: attributesJSON,
    reportType,
    setAddToCaseOpen,
    setIsSaveOpen,
    timeRange: customTimeRange ?? series?.time,
    withActions,
  });

  if (!attributesJSON && layerConfigs.length < 1) {
    return null;
  }

  if (!LensComponent) {
    return <EuiText>No lens component</EuiText>;
  }

  return (
    <Wrapper $customHeight={customHeight} $compressed={compressed}>
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
      <LensWrapper
        gutterSize="none"
        $alignLnsMetric={alignLnsMetric}
        $disableBorder={disableBorder}
        $disableShadow={disableShadow}
      >
        {metricIcon && (
          <EuiFlexItem style={{ justifyContent: 'space-evenly', paddingTop: '24px' }} grow={false}>
            <EuiIcon type={metricIcon} size="l" color={metricIconColor} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={metricIcon && metricPostfix ? false : 1}>
          <LensComponent
            id="exploratoryView"
            style={{ height: '100%' }}
            timeRange={customTimeRange ?? series?.time}
            attributes={attributesJSON}
            onBrushEnd={({ range }) => {}}
            withDefaultActions={Boolean(withActions)}
            extraActions={actions}
          />
        </EuiFlexItem>
        {metricPostfix && (
          <EuiFlexItem style={{ justifyContent: 'space-evenly', paddingTop: '24px' }} grow={false}>
            <EuiTitle size="s">
              <h3> {metricPostfix}</h3>
            </EuiTitle>
          </EuiFlexItem>
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
        />
      </LensWrapper>
    </Wrapper>
  );
}

const LensWrapper = styled(EuiFlexGroup)<{
  $alignLnsMetric?: string;
  $disableBorder?: boolean;
  $disableShadow?: boolean;
}>`
  .embPanel__optionsMenuPopover {
    visibility: collapse;
  }
  .embPanel--editing {
    background-color: transparent;
  }
  ${(props) =>
    props.$disableBorder
      ? `.embPanel--editing {
    border: 0;
  }`
      : ''}
  &&&:hover {
    .embPanel__optionsMenuPopover {
      visibility: visible;
    }
    ${(props) =>
      props.$disableShadow
        ? `.embPanel--editing {
      box-shadow: none;
    }`
        : ''}
  }
  .embPanel__title {
    display: none;
  }
  ${(props) =>
    props.$alignLnsMetric
      ? `.lnsMetricExpression__container {
    align-items: ${props.$alignLnsMetric};
  }`
      : ''}
`;

const Wrapper = styled.div<{
  $customHeight?: string | number;
  $compressed?: boolean;
}>`
  height: 100%;
  ${(props) => (props.$compressed ? 'position: relative;' : '')}
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
