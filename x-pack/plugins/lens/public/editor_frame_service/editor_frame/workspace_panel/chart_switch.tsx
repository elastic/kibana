/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './chart_switch.scss';
import React, { useState, useMemo, memo } from 'react';
import {
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectable,
  EuiIconTip,
  EuiSelectableOption,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Visualization, FramePublicAPI, Datasource, VisualizationType } from '../../../types';
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

type SelectableEntry = EuiSelectableOption<{ value: string }>;

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

const MAX_LIST_HEIGHT = 380;
const ENTRY_HEIGHT = 32;

function computeListHeight(list: SelectableEntry[], maxHeight: number): number {
  if (list.length === 0) {
    return 0;
  }
  return Math.min(list.length * ENTRY_HEIGHT, maxHeight);
}

function getCurrentVisualizationId(
  activeVisualization: Visualization,
  visualizationState: unknown
) {
  return activeVisualization.getVisualizationTypeId(visualizationState);
}

export const ChartSwitch = memo(function ChartSwitch(props: Props) {
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

  const { visualizationTypes, visualizationsLookup } = useMemo(
    () => {
      if (!flyoutOpen) {
        return { visualizationTypes: [], visualizationsLookup: {} };
      }
      const subVisualizationId = getCurrentVisualizationId(
        props.visualizationMap[props.visualizationId || ''],
        props.visualizationState
      );
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      // reorganize visualizations in groups
      const grouped: Record<
        string,
        {
          priority: number;
          visualizations: Array<
            VisualizationType & {
              visualizationId: string;
              selection: VisualizationSelection;
            }
          >;
        }
      > = {};
      // Will need it later on to quickly pick up the metadata from it
      const lookup: Record<
        string,
        VisualizationType & {
          visualizationId: string;
          selection: VisualizationSelection;
        }
      > = {};
      Object.entries(props.visualizationMap).forEach(([visualizationId, v]) => {
        for (const visualizationType of v.visualizationTypes) {
          const isSearchMatch =
            visualizationType.label.toLowerCase().includes(lowercasedSearchTerm) ||
            visualizationType.fullLabel?.toLowerCase().includes(lowercasedSearchTerm);
          if (isSearchMatch) {
            grouped[visualizationType.groupLabel] = grouped[visualizationType.groupLabel] || {
              priority: 0,
              visualizations: [],
            };
            const visualizationEntry = {
              ...visualizationType,
              visualizationId,
              selection: getSelection(visualizationId, visualizationType.id),
            };
            grouped[visualizationType.groupLabel].priority += visualizationType.sortPriority || 0;
            grouped[visualizationType.groupLabel].visualizations.push(visualizationEntry);
            lookup[`${visualizationId}:${visualizationType.id}`] = visualizationEntry;
          }
        }
      });

      return {
        visualizationTypes: Object.keys(grouped)
          .sort((groupA, groupB) => {
            return grouped[groupB].priority - grouped[groupA].priority;
          })
          .flatMap((group): SelectableEntry[] => {
            const { visualizations } = grouped[group];
            if (visualizations.length === 0) {
              return [];
            }
            return [
              {
                key: group,
                label: group,
                isGroupLabel: true,
                'aria-label': group,
                'data-test-subj': `lnsChartSwitchPopover_${group}`,
              } as SelectableEntry,
            ].concat(
              visualizations
                // alphabetical order within each group
                .sort((a, b) => {
                  return (a.fullLabel || a.label).localeCompare(b.fullLabel || b.label);
                })
                .map(
                  (v): SelectableEntry => ({
                    'aria-label': v.fullLabel || v.label,
                    className: 'lnsChartSwitch__option',
                    isGroupLabel: false,
                    key: `${v.visualizationId}:${v.id}`,
                    value: `${v.visualizationId}:${v.id}`,
                    'data-test-subj': `lnsChartSwitchPopover_${v.id}`,
                    label: v.fullLabel || v.label,
                    prepend: (
                      <EuiIcon className="lnsChartSwitch__chartIcon" type={v.icon || 'empty'} />
                    ),
                    append:
                      v.selection.dataLoss !== 'nothing' || v.showBetaBadge ? (
                        <EuiFlexGroup
                          gutterSize="xs"
                          responsive={false}
                          className="lnsChartSwitch__append"
                        >
                          {v.selection.dataLoss !== 'nothing' ? (
                            <EuiFlexItem grow={false}>
                              <EuiIconTip
                                aria-label={i18n.translate('xpack.lens.chartSwitch.dataLossLabel', {
                                  defaultMessage: 'Warning',
                                })}
                                type="alert"
                                color="warning"
                                content={i18n.translate(
                                  'xpack.lens.chartSwitch.dataLossDescription',
                                  {
                                    defaultMessage:
                                      'Selecting this chart type will result in a partial loss of currently applied configuration selections.',
                                  }
                                )}
                                iconProps={{
                                  className: 'lnsChartSwitch__chartIcon',
                                  'data-test-subj': `lnsChartSwitchPopoverAlert_${v.id}`,
                                }}
                              />
                            </EuiFlexItem>
                          ) : null}
                          {v.showBetaBadge ? (
                            <EuiFlexItem grow={false}>
                              <EuiBadge color="hollow">
                                <FormattedMessage
                                  id="xpack.lens.chartSwitch.betaLabel"
                                  defaultMessage="Beta"
                                />
                              </EuiBadge>
                            </EuiFlexItem>
                          ) : null}
                        </EuiFlexGroup>
                      ) : null,
                    // Apparently checked: null is not valid for TS
                    ...(subVisualizationId === v.id && { checked: 'on' }),
                  })
                )
            );
          }),
        visualizationsLookup: lookup,
      };
    },
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

  return (
    <div className="lnsChartSwitch__header">
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
          </EuiFlexGroup>
        </EuiPopoverTitle>
        <EuiSelectable
          className="lnsChartSwitch__options"
          height={computeListHeight(visualizationTypes, MAX_LIST_HEIGHT)}
          searchable
          singleSelection
          isPreFiltered
          data-test-subj="lnsChartSwitchList"
          searchProps={{
            incremental: true,
            className: 'lnsChartSwitch__search',
            'data-test-subj': 'lnsChartSwitchSearch',
            onSearch: (value) => setSearchTerm(value),
          }}
          options={visualizationTypes}
          onChange={(newOptions) => {
            const chosenType = newOptions.find(({ checked }) => checked === 'on')!;
            if (!chosenType) {
              return;
            }
            const id = chosenType.value!;
            commitSelection(visualizationsLookup[id].selection);
          }}
          noMatchesMessage={
            <FormattedMessage
              id="xpack.lens.chartSwitch.noResults"
              defaultMessage="No results found for {term}."
              values={{
                term: <strong>{searchTerm}</strong>,
              }}
            />
          }
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      </EuiPopover>
    </div>
  );
});

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
