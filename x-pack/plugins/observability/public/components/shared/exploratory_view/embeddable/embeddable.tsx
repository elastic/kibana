/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiIcon, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { AllSeries, createExploratoryViewUrl, useTheme } from '../../../..';
import { LayerConfig, LensAttributes } from '../configurations/lens_attributes';
import { AppDataType, ReportViewType } from '../types';
import { getLayerConfigs } from '../hooks/use_lens_attributes';
import { LensEmbeddableInput, LensPublicStart, XYState } from '../../../../../../lens/public';
import { OperationTypeComponent } from '../series_editor/columns/operation_type_select';
import { IndexPatternState } from '../hooks/use_app_index_pattern';
import { ReportConfigMap } from '../contexts/exploratory_view_config';
import { obsvReportConfigMap } from '../obsv_exploratory_view';
import { useActions } from './use_actions';
import { AddToCaseAction } from '../header/add_to_case_action';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';

export interface ExploratoryEmbeddableProps {
  alignLnsMetric?: string;
  appendTitle?: JSX.Element;
  appendHeader?: JSX.Element;
  appId?: 'security' | 'observability';
  attributes: AllSeries;
  axisTitlesVisibility?: XYState['axisTitlesVisibilitySettings'];
  compressed?: boolean;
  customHeight?: string | number;
  disableBorder?: boolean;
  disableShadow?: boolean;
  dataTypesIndexPatterns?: Partial<Record<AppDataType, string>>;
  legendIsVisible?: boolean;
  onBrushEnd?: (params: {
    table: any;
    column: number;
    range: number[];
    timeFieldName?: string | undefined;
  }) => void;
  reportConfigMap?: ReportConfigMap;
  withActions?: boolean | Array<'explore' | 'save' | 'addToCase'>;
  appId?: 'security' | 'observability';
  reportType: ReportViewType | string;
  showCalculationMethod?: boolean;
  showExploreButton?: boolean;
  metricIcon?: string;
  metricIconColor?: string;
  metricPostfix?: string;
  title?: string | JSX.Element;
  withActions?: boolean;
}

export interface ExploratoryEmbeddableComponentProps extends ExploratoryEmbeddableProps {
  indexPatterns: IndexPatternState;
  lens: LensPublicStart;
}

// eslint-disable-next-line import/no-default-export
export default function Embeddable({
  alignLnsMetric,
  appendTitle,
  appendHeader,
  appId,
  attributes,
  axisTitlesVisibility,
  compressed = false,
  customHeight,
  disableBorder = false,
  disableShadow = false,
  indexPatterns,
  lens,
  appId,
  axisTitlesVisibility,
  legendIsVisible,
  metricIcon,
  metricIconColor,
  metricPostfix,
  onBrushEnd,
  withActions = true,
  reportConfigMap = {},
  reportType,
  showCalculationMethod = false,
  showExploreButton = true,
  title,
  withActions = true,
}: ExploratoryEmbeddableComponentProps) {
  const LensComponent = lens?.EmbeddableComponent;
  const LensSaveModalComponent = lens?.SaveModalComponent;

  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isAddToCaseOpen, setAddToCaseOpen] = useState(false);

  const { http } = useKibana().services;

  const series = Object.entries(attributes)[0][1];

  const [operationType, setOperationType] = useState(series?.operationType);
  const theme = useTheme();
  const actions = useActions({
    withActions,
    attributes,
    reportType,
    appId,
    setIsSaveOpen,
    setAddToCaseOpen,
  });

  const layerConfigs: LayerConfig[] = getLayerConfigs(
    attributes,
    reportType,
    theme,
    indexPatterns,
    { ...reportConfigMap, ...obsvReportConfigMap }
  );

  if (layerConfigs.length < 1) {
    return null;
  }
  const lensAttributes = new LensAttributes(layerConfigs, reportType);

  if (!LensComponent) {
    return <EuiText>No lens component</EuiText>;
  }

  const attributesJSON = lensAttributes.getJSON();

  (attributesJSON.state.visualization as XYState).axisTitlesVisibilitySettings =
    axisTitlesVisibility;

  if (typeof legendIsVisible !== 'undefined') {
    (attributesJSON.state.visualization as XYState).legend.isVisible = legendIsVisible;
  }

  const href = createExploratoryViewUrl(
    { reportType, allSeries: attributes },
    http?.basePath.get(),
    appId
  );

  return (
    <Wrapper $customHeight={customHeight} $compressed={compressed}>
      <StyledFlexGroup alignItems="center" $compressed={compressed} gutterSize="none">
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
        {appendHeader}
        {showExploreButton && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon href={href} size="s" iconType="visBarVerticalStacked" />
          </EuiFlexItem>
        )}
        {appendTitle}
      </StyledFlexGroup>
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
            timeRange={series?.time}
            attributes={attributesJSON}
            onBrushEnd={({ range }) => {}}
            withActions={actions}
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
          timeRange={series?.time}
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
      height: ${(props) => (props.$customHeight ? `${props.$customHeight};` : `calc(100% - 32px);`)}
  }
`;

const StyledFlexGroup = styled(EuiFlexGroup)<{
  $compressed?: boolean;
}>`
  ${(props) =>
    props.$compressed
      ? `position: absolute;
         top: 0;
         z-index: 1;`
      : ''}
`;
