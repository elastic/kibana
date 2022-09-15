/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiPopover, EuiSelectable, EuiText, EuiPopoverTitle } from '@elastic/eui';
import { ToolbarButton } from '@kbn/kibana-react-plugin/public';
import { IconChartBarReferenceLine, IconChartBarAnnotations } from '@kbn/chart-icons';
import type {
  VisualizationLayerHeaderContentProps,
  VisualizationLayerWidgetProps,
  VisualizationType,
} from '../../../types';
import { State, visualizationTypes, SeriesType, XYAnnotationLayerConfig } from '../types';
import { isHorizontalChart, isHorizontalSeries } from '../state_helpers';
import { ChangeIndexPattern, StaticHeader } from '../../../shared_components';
import { updateLayer } from '.';
import { isAnnotationsLayer, isDataLayer, isReferenceLayer } from '../visualization_helpers';

export function LayerHeader(props: VisualizationLayerWidgetProps<State>) {
  const layer = props.state.layers.find((l) => l.layerId === props.layerId);
  if (!layer) {
    return null;
  }
  if (isReferenceLayer(layer)) {
    return <ReferenceLayerHeader />;
  }
  if (isAnnotationsLayer(layer)) {
    return <AnnotationsLayerHeader />;
  }
  return <DataLayerHeader {...props} />;
}

export function LayerHeaderContent(props: VisualizationLayerHeaderContentProps<State>) {
  const layer = props.state.layers.find((l) => l.layerId === props.layerId);
  if (layer && isAnnotationsLayer(layer)) {
    return <AnnotationLayerHeaderContent {...props} />;
  }
  return null;
}

function ReferenceLayerHeader() {
  return (
    <StaticHeader
      icon={IconChartBarReferenceLine}
      label={i18n.translate('xpack.lens.xyChart.layerReferenceLineLabel', {
        defaultMessage: 'Reference lines',
      })}
    />
  );
}

function AnnotationsLayerHeader() {
  return (
    <StaticHeader
      icon={IconChartBarAnnotations}
      label={i18n.translate('xpack.lens.xyChart.layerAnnotationsLabel', {
        defaultMessage: 'Annotations',
      })}
    />
  );
}

function AnnotationLayerHeaderContent({
  frame,
  state,
  layerId,
  onChangeIndexPattern,
}: VisualizationLayerHeaderContentProps<State>) {
  const notFoundTitleLabel = i18n.translate('xpack.lens.layerPanel.missingDataView', {
    defaultMessage: 'Data view not found',
  });
  const layerIndex = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[layerIndex] as XYAnnotationLayerConfig;
  const currentIndexPattern = frame.dataViews.indexPatterns[layer.indexPatternId];

  return (
    <ChangeIndexPattern
      data-test-subj="indexPattern-switcher"
      trigger={{
        label: currentIndexPattern?.name || notFoundTitleLabel,
        title: currentIndexPattern?.title || notFoundTitleLabel,
        'data-test-subj': 'lns_layerIndexPatternLabel',
        size: 's',
        fontWeight: 'normal',
      }}
      indexPatternId={layer.indexPatternId}
      indexPatternRefs={frame.dataViews.indexPatternRefs}
      isMissingCurrent={!currentIndexPattern}
      onChangeIndexPattern={onChangeIndexPattern}
    />
  );
}

function DataLayerHeader(props: VisualizationLayerWidgetProps<State>) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const { state, layerId } = props;
  const layers = state.layers.filter(isDataLayer);
  const layer = layers.find((l) => l.layerId === layerId)!;
  const index = state.layers.findIndex((l) => l === layer)!;
  const currentVisType = visualizationTypes.find(({ id }) => id === layer.seriesType)!;
  const horizontalOnly = isHorizontalChart(state.layers);

  return (
    <EuiPopover
      panelClassName="lnsChangeIndexPatternPopover"
      button={
        <DataLayerHeaderTrigger
          onClick={() => setPopoverIsOpen(!isPopoverOpen)}
          currentVisType={currentVisType}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setPopoverIsOpen(false)}
      display="block"
      panelPaddingSize="s"
      ownFocus
    >
      <EuiPopoverTitle>
        {i18n.translate('xpack.lens.layerPanel.layerVisualizationType', {
          defaultMessage: 'Layer visualization type',
        })}
      </EuiPopoverTitle>
      <div>
        <EuiSelectable<{
          key?: string;
          label: string;
          value?: string;
          checked?: 'on' | 'off';
        }>
          singleSelection="always"
          options={visualizationTypes
            .filter((t) => isHorizontalSeries(t.id as SeriesType) === horizontalOnly)
            .map((t) => ({
              value: t.id,
              key: t.id,
              checked: t.id === currentVisType.id ? 'on' : undefined,
              prepend: <EuiIcon type={t.icon} />,
              label: t.fullLabel || t.label,
              'data-test-subj': `lnsXY_seriesType-${t.id}`,
            }))}
          onChange={(newOptions) => {
            const chosenType = newOptions.find(({ checked }) => checked === 'on');
            if (!chosenType) {
              return;
            }
            const id = chosenType.value!;
            props.setState(updateLayer(state, { ...layer, seriesType: id as SeriesType }, index));
            setPopoverIsOpen(false);
          }}
        >
          {(list) => <>{list}</>}
        </EuiSelectable>
      </div>
    </EuiPopover>
  );
}

const DataLayerHeaderTrigger = function ({
  currentVisType,
  onClick,
}: {
  currentVisType: VisualizationType;
  onClick: () => void;
}) {
  return (
    <ToolbarButton
      data-test-subj="lns_layer_settings"
      title={currentVisType.fullLabel || currentVisType.label}
      onClick={onClick}
      fullWidth
      size="s"
    >
      <>
        <EuiIcon type={currentVisType.icon} />
        <EuiText size="s" className="lnsLayerPanelChartSwitch_title">
          {currentVisType.fullLabel || currentVisType.label}
        </EuiText>
      </>
    </ToolbarButton>
  );
};
