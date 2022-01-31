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

export interface ExploratoryEmbeddableProps {
  reportType: ReportViewType;
  attributes: AllSeries;
  appendTitle?: JSX.Element;
  title: string | JSX.Element;
  showCalculationMethod?: boolean;
  axisTitlesVisibility?: XYState['axisTitlesVisibilitySettings'];
  legendIsVisible?: boolean;
  dataTypesIndexPatterns?: Partial<Record<AppDataType, string>>;
  reportConfigMap?: ReportConfigMap;
  withActions?: boolean | ActionTypes[];
  appId?: 'security' | 'observability';
}

export interface ExploratoryEmbeddableComponentProps extends ExploratoryEmbeddableProps {
  lens: LensPublicStart;
  indexPatterns: IndexPatternState;
}

// eslint-disable-next-line import/no-default-export
export default function Embeddable({
  reportType,
  attributes,
  title,
  appendTitle,
  indexPatterns,
  lens,
  appId,
  axisTitlesVisibility,
  legendIsVisible,
  withActions = true,
  reportConfigMap = {},
  showCalculationMethod = false,
}: ExploratoryEmbeddableComponentProps) {
  const LensComponent = lens?.EmbeddableComponent;
  const LensSaveModalComponent = lens?.SaveModalComponent;

  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isAddToCaseOpen, setAddToCaseOpen] = useState(false);

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
  const lensAttributes = new LensAttributes(layerConfigs);

  if (!LensComponent) {
    return <EuiText>No lens component</EuiText>;
  }

  const attributesJSON = lensAttributes.getJSON();

  (attributesJSON.state.visualization as XYState).axisTitlesVisibilitySettings =
    axisTitlesVisibility;

  if (typeof legendIsVisible !== 'undefined') {
    (attributesJSON.state.visualization as XYState).legend.isVisible = legendIsVisible;
  }

  return (
    <Wrapper>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
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
      <LensComponent
        id="exploratoryView"
        style={{ height: '100%' }}
        timeRange={series?.time}
        attributes={attributesJSON}
        onBrushEnd={({ range }) => {}}
        withDefaultActions={Boolean(withActions)}
        extraActions={actions}
      />
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
    </Wrapper>
  );
}

const Wrapper = styled.div`
  height: 100%;
  &&& {
    > :nth-child(2) {
      height: calc(100% - 32px);
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
