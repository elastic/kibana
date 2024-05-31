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
  EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ChartSwitchTrigger } from '@kbn/visualization-ui-components';
import {
  Visualization,
  FramePublicAPI,
  VisualizationType,
  VisualizationMap,
  DatasourceMap,
  Suggestion,
} from '../../../../types';
import { getSuggestions, switchToSuggestion } from '../../suggestion_helpers';
import { showMemoizedErrorNotification } from '../../../../lens_ui_errors';
import {
  insertLayer,
  removeLayers,
  useLensDispatch,
  useLensSelector,
  VisualizationState,
  DatasourceStates,
  selectActiveDatasourceId,
  selectVisualization,
  selectDatasourceStates,
} from '../../../../state_management';
import { generateId } from '../../../../id_generator/id_generator';
import { ChartOptionAppend } from './chart_option_append';

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

export interface ChartSwitchProps {
  framePublicAPI: FramePublicAPI;
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  layerId: string;
}

type SelectableEntry = EuiSelectableOption<{ value: string }>;

const MAX_LIST_HEIGHT = 380;
const ENTRY_HEIGHT = 32;

function computeListHeight(list: SelectableEntry[], maxHeight: number): number {
  if (list.length === 0) {
    return 0;
  }
  return Math.min(list.length * ENTRY_HEIGHT, maxHeight);
}

function safeFnCall<TReturn>(action: () => TReturn, defaultReturnValue: TReturn): TReturn {
  try {
    return action();
  } catch (error) {
    showMemoizedErrorNotification(error);
    return defaultReturnValue;
  }
}

function getCurrentVisualizationId(
  activeVisualization: Visualization,
  visualizationState: unknown
) {
  return safeFnCall(
    () => activeVisualization.getVisualizationTypeId(visualizationState),
    undefined
  );
}

export const ChartSwitch = memo(function ChartSwitch({
  framePublicAPI,
  visualizationMap,
  datasourceMap,
  layerId,
}: ChartSwitchProps) {
  const [flyoutOpen, setFlyoutOpen] = useState<boolean>(false);
  const dispatchLens = useLensDispatch();
  const activeDatasourceId = useLensSelector(selectActiveDatasourceId);
  const visualization = useLensSelector(selectVisualization);
  const datasourceStates = useLensSelector(selectDatasourceStates);

  const commitSelection = (selection: VisualizationSelection) => {
    switchToSuggestion(
      dispatchLens,
      {
        ...selection,
        visualizationState: selection.getVisualizationState(),
      },
      { clearStagedPreview: true }
    );

    if (
      (!selection.datasourceId && !selection.sameDatasources) ||
      selection.dataLoss === 'everything'
    ) {
      dispatchLens(
        removeLayers({
          visualizationId: visualization.activeId,
          layerIds: Object.keys(framePublicAPI.datasourceLayers),
        })
      );
    }
  };

  function getSelection(
    visualizationId: string,
    subVisualizationId: string
  ): VisualizationSelection {
    const newVisualization = visualizationMap[visualizationId];
    const switchVisType = (type: string, state: unknown, lId: string) => {
      if (visualizationMap[visualizationId].switchVisualizationType) {
        return safeFnCall(
          () => visualizationMap[visualizationId].switchVisualizationType!(type, state, lId),
          state
        );
      }
      return state;
    };
    const layers = Object.entries(framePublicAPI.datasourceLayers);
    const containsData = layers.some(
      ([_layerId, datasource]) => datasource && datasource.getTableSpec().length > 0
    );

    // Always show the active visualization as a valid selection
    if (
      visualization.activeId === visualizationId &&
      visualization.state &&
      safeFnCall(
        () =>
          newVisualization.getVisualizationTypeId(visualization.state) === subVisualizationId ||
          newVisualization.isSubtypeCompatible?.(
            newVisualization.getVisualizationTypeId(visualization.state),
            subVisualizationId
          ),
        false
      )
    ) {
      return {
        visualizationId,
        subVisualizationId,
        dataLoss: 'nothing',
        keptLayerIds: Object.keys(framePublicAPI.datasourceLayers),
        getVisualizationState: () =>
          switchVisType(subVisualizationId, visualization.state, layerId),
        sameDatasources: true,
      };
    }

    const topSuggestion = getTopSuggestion(
      visualizationMap,
      datasourceMap,
      framePublicAPI,
      visualizationId,
      datasourceStates,
      visualization,
      newVisualization,
      subVisualizationId,
      layerId
    );

    let dataLoss: VisualizationSelection['dataLoss'];

    if (!containsData) {
      dataLoss = 'nothing';
    } else if (!topSuggestion) {
      dataLoss = 'everything';
    } else if (layers.length > 1 && layers.length > topSuggestion.keptLayerIds.length) {
      dataLoss = 'layers';
    } else if (topSuggestion.columns !== layers[0][1]?.getTableSpec().length) {
      dataLoss = 'columns';
    } else {
      dataLoss = 'nothing';
    }

    function addNewLayer() {
      const newLayerId = generateId();
      dispatchLens(
        insertLayer({
          datasourceId: activeDatasourceId!,
          layerId: newLayerId,
        })
      );
      return newLayerId;
    }

    return {
      visualizationId,
      subVisualizationId,
      dataLoss,
      getVisualizationState: topSuggestion
        ? () =>
            switchVisType(
              subVisualizationId,
              newVisualization.initialize(addNewLayer, topSuggestion.visualizationState),
              layerId
            )
        : () =>
            switchVisType(
              subVisualizationId,
              newVisualization.initialize(
                addNewLayer,
                visualization.activeId === newVisualization.id ? visualization.state : undefined,
                visualization.activeId && visualizationMap[visualization.activeId].getMainPalette
                  ? visualizationMap[visualization.activeId].getMainPalette!(visualization.state)
                  : undefined
              ),
              layerId
            ),
      keptLayerIds: topSuggestion ? topSuggestion.keptLayerIds : [],
      datasourceState: topSuggestion ? topSuggestion.datasourceState : undefined,
      datasourceId: topSuggestion ? topSuggestion.datasourceId : undefined,
      sameDatasources: dataLoss === 'nothing' && visualization.activeId === newVisualization.id,
    };
  }

  const [searchTerm, setSearchTerm] = useState('');

  const { visualizationTypes, visualizationsLookup } = useMemo(
    () => {
      if (!flyoutOpen) {
        return { visualizationTypes: [], visualizationsLookup: {} };
      }
      const subVisualizationId =
        visualization.activeId && visualizationMap[visualization.activeId]
          ? getCurrentVisualizationId(visualizationMap[visualization.activeId], visualization.state)
          : undefined;
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
      Object.entries(visualizationMap).forEach(([visualizationId, v]) => {
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
                  return (
                    (b.sortOrder ?? 0) - (a.sortOrder ?? 0) ||
                    (a.fullLabel || a.label).localeCompare(b.fullLabel || b.label)
                  );
                })
                .map((v): SelectableEntry => {
                  return {
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
                      v.selection.dataLoss !== 'nothing' || v.showExperimentalBadge ? (
                        <ChartOptionAppend
                          dataLoss={v.selection.dataLoss}
                          showExperimentalBadge={v.showExperimentalBadge}
                          id={v.selection.subVisualizationId}
                        />
                      ) : null,
                    // Apparently checked: null is not valid for TS
                    ...(subVisualizationId === v.id && { checked: 'on' }),
                  };
                })
            );
          }),
        visualizationsLookup: lookup,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      flyoutOpen,
      visualizationMap,
      framePublicAPI,
      visualization.activeId,
      visualization.state,
      searchTerm,
    ]
  );

  const { icon, label } = (visualization.activeId &&
    visualizationMap[visualization.activeId]?.getDescription(visualization.state, layerId)) || {
    label: i18n.translate('xpack.lens.configPanel.selectVisualization', {
      defaultMessage: 'Select a visualization',
    }),
    icon: undefined,
  };

  return (
    <div className="lnsChartSwitch__header">
      <EuiPopover
        id="lnsChartSwitchPopover"
        ownFocus
        initialFocus=".lnsChartSwitch__popoverPanel"
        panelClassName="lnsChartSwitch__popoverPanel"
        panelPaddingSize="s"
        button={
          <ChartSwitchTrigger
            icon={icon}
            label={label}
            dataTestSubj="lnsChartSwitchPopover"
            onClick={() => setFlyoutOpen(!flyoutOpen)}
          />
        }
        isOpen={flyoutOpen}
        closePopover={() => setFlyoutOpen(false)}
        anchorPosition="downLeft"
      >
        <EuiPopoverTitle>
          <EuiFlexGroup alignItems="center" responsive={false}>
            <EuiFlexItem>
              {i18n.translate('xpack.lens.configPanel.visualizationType', {
                defaultMessage: 'Visualization type',
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
            className: 'lnsChartSwitch__search',
            'data-test-subj': 'lnsChartSwitchSearch',
            onChange: (value) => setSearchTerm(value),
          }}
          options={visualizationTypes}
          onChange={(newOptions) => {
            setFlyoutOpen(false);
            const chosenType = newOptions.find(({ checked }) => checked === 'on');
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
  visualizationMap: VisualizationMap,
  datasourceMap: DatasourceMap,
  framePublicAPI: FramePublicAPI,
  visualizationId: string,
  datasourceStates: DatasourceStates,
  visualization: VisualizationState,
  newVisualization: Visualization<unknown>,
  subVisualizationId?: string,
  layerId?: string
): Suggestion | undefined {
  const mainPalette =
    visualization.activeId &&
    visualizationMap[visualization.activeId] &&
    visualizationMap[visualization.activeId].getMainPalette
      ? visualizationMap[visualization.activeId].getMainPalette!(visualization.state)
      : undefined;

  const unfilteredSuggestions = getSuggestions({
    datasourceMap,
    datasourceStates,
    visualizationMap: { [visualizationId]: newVisualization },
    activeVisualization: visualization.activeId
      ? visualizationMap[visualization.activeId]
      : undefined,
    visualizationState: visualization.state,
    subVisualizationId,
    activeData: framePublicAPI.activeData,
    mainPalette,
    dataViews: framePublicAPI.dataViews,
  });
  const suggestions = unfilteredSuggestions.filter((suggestion) => {
    // don't use extended versions of current data table on switching between visualizations
    // to avoid confusing the user.
    return (
      suggestion.changeType !== 'extended' &&
      safeFnCall(
        () =>
          newVisualization.getVisualizationTypeId(suggestion.visualizationState) ===
          subVisualizationId,
        false
      )
    );
  });

  return (
    suggestions.find((s) => s.changeType === 'unchanged' || s.changeType === 'reduced') ||
    suggestions.find((s) => s.keptLayerIds.some((id) => id === layerId)) ||
    suggestions[0]
  );
}
