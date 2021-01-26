/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './chart_switch.scss';
import React, { useState, useMemo } from 'react';
import {
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectableMessage,
} from '@elastic/eui';
import { flatten } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Visualization, FramePublicAPI, Datasource } from '../../../types';
import { Action } from '../state_management';
import { getSuggestions, switchToSuggestion, Suggestion } from '../suggestion_helpers';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import { ToolbarButton } from '../../../../../../../src/plugins/kibana_react/public';

interface VisualizationSelection {
  visualizationId: string;
  subVisualizationId: string;
  getVisualizationState: () => unknown;
  keptLayerIds: string[];
  dataLoss: 'nothing' | 'layers' | 'everything' | 'columns';
  datasourceId?: string;
  datasourceState?: unknown;
  sameDatasources?: boolean;
}

interface Props {
  dispatch: (action: Action) => void;
  visualizationMap: Record<string, Visualization>;
  visualizationId: string | null;
  visualizationState: unknown;
  framePublicAPI: FramePublicAPI;
  datasourceMap: Record<string, Datasource>;
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >;
}

function VisualizationSummary(props: Props) {
  const visualization = props.visualizationMap[props.visualizationId || ''];

  if (!visualization) {
    return (
      <>
        {i18n.translate('xpack.lens.configPanel.selectVisualization', {
          defaultMessage: 'Select a visualization',
        })}
      </>
    );
  }

  const description = visualization.getDescription(props.visualizationState);

  return (
    <>
      {description.icon && (
        <EuiIcon size="l" className="lnsChartSwitch__summaryIcon" type={description.icon} />
      )}
      {description.label}
    </>
  );
}

export function ChartSwitch(props: Props) {
  const [flyoutOpen, setFlyoutOpen] = useState<boolean>(false);

  const commitSelection = (selection: VisualizationSelection) => {
    setFlyoutOpen(false);

    trackUiEvent(`chart_switch`);

    switchToSuggestion(
      props.dispatch,
      {
        ...selection,
        visualizationState: selection.getVisualizationState(),
      },
      'SWITCH_VISUALIZATION'
    );

    if (
      (!selection.datasourceId && !selection.sameDatasources) ||
      selection.dataLoss === 'everything'
    ) {
      props.framePublicAPI.removeLayers(Object.keys(props.framePublicAPI.datasourceLayers));
    }
  };

  function getSelection(
    visualizationId: string,
    subVisualizationId: string
  ): VisualizationSelection {
    const newVisualization = props.visualizationMap[visualizationId];
    const switchVisType =
      props.visualizationMap[visualizationId].switchVisualizationType ||
      ((_type: string, initialState: unknown) => initialState);
    const layers = Object.entries(props.framePublicAPI.datasourceLayers);
    const containsData = layers.some(
      ([_layerId, datasource]) => datasource.getTableSpec().length > 0
    );
    // Always show the active visualization as a valid selection
    if (
      props.visualizationId === visualizationId &&
      props.visualizationState &&
      newVisualization.getVisualizationTypeId(props.visualizationState) === subVisualizationId
    ) {
      return {
        visualizationId,
        subVisualizationId,
        dataLoss: 'nothing',
        keptLayerIds: Object.keys(props.framePublicAPI.datasourceLayers),
        getVisualizationState: () => switchVisType(subVisualizationId, props.visualizationState),
        sameDatasources: true,
      };
    }

    const topSuggestion = getTopSuggestion(
      props,
      visualizationId,
      newVisualization,
      subVisualizationId
    );

    let dataLoss: VisualizationSelection['dataLoss'];

    if (!containsData) {
      dataLoss = 'nothing';
    } else if (!topSuggestion) {
      dataLoss = 'everything';
    } else if (layers.length > 1 && layers.length !== topSuggestion.keptLayerIds.length) {
      dataLoss = 'layers';
    } else if (topSuggestion.columns !== layers[0][1].getTableSpec().length) {
      dataLoss = 'columns';
    } else {
      dataLoss = 'nothing';
    }

    return {
      visualizationId,
      subVisualizationId,
      dataLoss,
      getVisualizationState: topSuggestion
        ? () =>
            switchVisType(
              subVisualizationId,
              newVisualization.initialize(props.framePublicAPI, topSuggestion.visualizationState)
            )
        : () => {
            return switchVisType(
              subVisualizationId,
              newVisualization.initialize(
                props.framePublicAPI,
                props.visualizationId === newVisualization.id
                  ? props.visualizationState
                  : undefined,
                props.visualizationId &&
                  props.visualizationMap[props.visualizationId].getMainPalette
                  ? props.visualizationMap[props.visualizationId].getMainPalette!(
                      props.visualizationState
                    )
                  : undefined
              )
            );
          },
      keptLayerIds: topSuggestion ? topSuggestion.keptLayerIds : [],
      datasourceState: topSuggestion ? topSuggestion.datasourceState : undefined,
      datasourceId: topSuggestion ? topSuggestion.datasourceId : undefined,
      sameDatasources: dataLoss === 'nothing' && props.visualizationId === newVisualization.id,
    };
  }

  const [searchTerm, setSearchTerm] = useState('');

  const visualizationTypes = useMemo(
    () =>
      flyoutOpen &&
      flatten(
        Object.values(props.visualizationMap).map((v) =>
          v.visualizationTypes.map((t) => ({
            visualizationId: v.id,
            ...t,
            icon: t.icon,
          }))
        )
      )
        .filter(
          (visualizationType) =>
            visualizationType.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (visualizationType.fullLabel &&
              visualizationType.fullLabel.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .map((visualizationType) => ({
          ...visualizationType,
          selection: getSelection(visualizationType.visualizationId, visualizationType.id),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      flyoutOpen,
      props.visualizationMap,
      props.framePublicAPI,
      props.visualizationId,
      props.visualizationState,
      searchTerm,
    ]
  );

  const popover = (
    <EuiPopover
      id="lnsChartSwitchPopover"
      ownFocus
      initialFocus=".lnsChartSwitch__popoverPanel"
      panelClassName="lnsChartSwitch__popoverPanel"
      panelPaddingSize="s"
      button={
        <ToolbarButton
          onClick={() => setFlyoutOpen(!flyoutOpen)}
          data-test-subj="lnsChartSwitchPopover"
          fontWeight="bold"
        >
          <VisualizationSummary {...props} />
        </ToolbarButton>
      }
      isOpen={flyoutOpen}
      closePopover={() => setFlyoutOpen(false)}
      anchorPosition="downLeft"
    >
      <EuiPopoverTitle>
        <EuiFlexGroup alignItems="center" responsive={false}>
          <EuiFlexItem>
            {i18n.translate('xpack.lens.configPanel.chartType', {
              defaultMessage: 'Chart type',
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFieldSearch
              compressed
              fullWidth={false}
              className="lnsChartSwitch__search"
              value={searchTerm}
              data-test-subj="lnsChartSwitchSearch"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <EuiKeyPadMenu>
        {(visualizationTypes || []).map((v) => (
          <EuiKeyPadMenuItem
            key={`${v.visualizationId}:${v.id}`}
            label={<span data-test-subj="visTypeTitle">{v.label}</span>}
            title={v.fullLabel}
            role="menuitem"
            data-test-subj={`lnsChartSwitchPopover_${v.id}`}
            onClick={() => commitSelection(v.selection)}
            betaBadgeLabel={
              v.selection.dataLoss !== 'nothing'
                ? i18n.translate('xpack.lens.chartSwitch.dataLossLabel', {
                    defaultMessage: 'Data loss',
                  })
                : undefined
            }
            betaBadgeTooltipContent={
              v.selection.dataLoss !== 'nothing'
                ? i18n.translate('xpack.lens.chartSwitch.dataLossDescription', {
                    defaultMessage: 'Switching to this chart will lose some of the configuration',
                  })
                : undefined
            }
            betaBadgeIconType={v.selection.dataLoss !== 'nothing' ? 'alert' : undefined}
          >
            <EuiIcon className="lnsChartSwitch__chartIcon" type={v.icon || 'empty'} size="l" />
          </EuiKeyPadMenuItem>
        ))}
      </EuiKeyPadMenu>
      {searchTerm && (visualizationTypes || []).length === 0 && (
        <EuiSelectableMessage>
          <FormattedMessage
            id="xpack.lens.chartSwitch.noResults"
            defaultMessage="No results found for {term}."
            values={{
              term: <strong>{searchTerm}</strong>,
            }}
          />
        </EuiSelectableMessage>
      )}
    </EuiPopover>
  );

  return <div className="lnsChartSwitch__header">{popover}</div>;
}

function getTopSuggestion(
  props: Props,
  visualizationId: string,
  newVisualization: Visualization<unknown>,
  subVisualizationId?: string
): Suggestion | undefined {
  const mainPalette =
    props.visualizationId &&
    props.visualizationMap[props.visualizationId] &&
    props.visualizationMap[props.visualizationId].getMainPalette
      ? props.visualizationMap[props.visualizationId].getMainPalette!(props.visualizationState)
      : undefined;
  const unfilteredSuggestions = getSuggestions({
    datasourceMap: props.datasourceMap,
    datasourceStates: props.datasourceStates,
    visualizationMap: { [visualizationId]: newVisualization },
    activeVisualizationId: props.visualizationId,
    visualizationState: props.visualizationState,
    subVisualizationId,
    activeData: props.framePublicAPI.activeData,
    mainPalette,
  });
  const suggestions = unfilteredSuggestions.filter((suggestion) => {
    // don't use extended versions of current data table on switching between visualizations
    // to avoid confusing the user.
    return (
      suggestion.changeType !== 'extended' &&
      newVisualization.getVisualizationTypeId(suggestion.visualizationState) === subVisualizationId
    );
  });

  // We prefer unchanged or reduced suggestions when switching
  // charts since that allows you to switch from A to B and back
  // to A with the greatest chance of preserving your original state.
  return (
    suggestions.find((s) => s.changeType === 'unchanged') ||
    suggestions.find((s) => s.changeType === 'reduced') ||
    suggestions[0]
  );
}
