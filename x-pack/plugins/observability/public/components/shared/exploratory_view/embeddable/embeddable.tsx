/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { AllSeries, createExploratoryViewUrl, useTheme } from '../../../..';
import { LayerConfig, LensAttributes } from '../configurations/lens_attributes';
import { AppDataType, ReportViewType } from '../types';
import { getLayerConfigs } from '../hooks/use_lens_attributes';
import { LensPublicStart, XYState } from '../../../../../../lens/public';
import { OperationTypeComponent } from '../series_editor/columns/operation_type_select';
import { IndexPatternState } from '../hooks/use_app_index_pattern';
import { ReportConfigMap } from '../contexts/exploatory_view_config';
import { obsvReportConfigMap } from '../obsv_exploratory_view';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';

export interface ExploratoryEmbeddableProps {
  appendTitle?: JSX.Element;
  appId?: 'security' | 'observability';
  attributes: AllSeries;
  axisTitlesVisibility?: XYState['axisTitlesVisibilitySettings'];
  customHeight?: boolean;
  disableBorder?: boolean;
  disableShadow?: boolean;
  dataTypesIndexPatterns?: Partial<Record<AppDataType, string>>;
  legendIsVisible?: boolean;
  reportConfigMap?: ReportConfigMap;
  reportType: ReportViewType;
  showCalculationMethod?: boolean;
  showExploreButton?: boolean;
  title?: string | JSX.Element;
  withActions?: boolean;
}

export interface ExploratoryEmbeddableComponentProps extends ExploratoryEmbeddableProps {
  indexPatterns: IndexPatternState;
  lens: LensPublicStart;
}

// eslint-disable-next-line import/no-default-export
export default function Embeddable({
  appendTitle,
  appId,
  attributes,
  axisTitlesVisibility,
  customHeight = true,
  disableBorder = false,
  disableShadow = false,
  indexPatterns,
  legendIsVisible,
  lens,
  reportConfigMap = {},
  reportType,
  showCalculationMethod = false,
  showExploreButton = true,
  title,
  withActions = true,
}: ExploratoryEmbeddableComponentProps) {
  const LensComponent = lens?.EmbeddableComponent;

  const { http } = useKibana().services;

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
    <Wrapper $customHeight={customHeight}>
      <EuiFlexGroup alignItems="center">
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
        {showExploreButton && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon href={href} size="s" iconType="visBarVerticalStacked" />
          </EuiFlexItem>
        )}
        {appendTitle}
      </EuiFlexGroup>
      <LensWrapper $disableBorder={disableBorder} $disableShadow={disableShadow}>
        <LensComponent
          id="exploratoryView"
          style={{ height: '100%' }}
          timeRange={series?.time}
          attributes={attributesJSON}
          onBrushEnd={({ range }) => {}}
          withActions={withActions}
        />
      </LensWrapper>
    </Wrapper>
  );
}

const LensWrapper = styled.div<{
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
`;

const Wrapper = styled.div<{
  $customHeight?: boolean;
}>`
  height: 100%;
  &&& {
    > :nth-child(2) {
      height: ${(props) => (props.$customHeight ? `calc(100% - 32px);` : `100%;`)}
  }
`;
