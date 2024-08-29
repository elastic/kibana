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
  useEuiTheme,
  EuiIconTip,
  IconType,
  EuiSelectableProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ChartSwitchTrigger } from '@kbn/visualization-ui-components';
import { css } from '@emotion/react';
import { ExperimentalBadge } from '../../../../shared_components';
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
import { ChartOption } from './chart_option';

type VisChartSwitchPosition = VisualizationType & {
  visualizationId: string;
  selection: VisualizationSelection;
};

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

type SelectableEntry = EuiSelectableOption<{
  value: string;
  description?: string;
  icon?: IconType;
}>;

const ITEM_HEIGHT = 52;
const MAX_ITEMS_COUNT = 6;
const MAX_LIST_HEIGHT = ITEM_HEIGHT * MAX_ITEMS_COUNT;

function computeListHeight(list: SelectableEntry[]) {
  if (list.length > MAX_ITEMS_COUNT) {
    return MAX_LIST_HEIGHT;
  }
}

const sortByPriority = (a: VisualizationType, b: VisualizationType) => {
  return a.sortPriority - b.sortPriority;
};

const deprecatedGroupChartSwitchElement = {
  key: 'deprecated',
  value: 'deprecated',
  label: i18n.translate('xpack.lens.configPanel.deprecated', {
    defaultMessage: 'Deprecated',
  }),
  isGroupLabel: true,
  'aria-label': 'deprecated',
  'data-test-subj': `lnsChartSwitchPopover_deprecated`,
};

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
  visualizationState: unknown,
  layerId?: string
) {
  return safeFnCall(
    () => activeVisualization.getVisualizationTypeId(visualizationState, layerId),
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
          ? getCurrentVisualizationId(
              visualizationMap[visualization.activeId],
              visualization.state,
              layerId
            )
          : undefined;
      const lowercasedSearchTerm = searchTerm.toLowerCase();

      // Will need it later on to quickly pick up the metadata from it
      const lookup: Record<
        string,
        VisualizationType & {
          visualizationId: string;
          selection: VisualizationSelection;
        }
      > = {};

      const chartSwitchPositions: VisChartSwitchPosition[] = [];
      const deprecatedChartSwitchPositions: VisChartSwitchPosition[] = [];
      Object.entries(visualizationMap).forEach(([visualizationId, v]) => {
        const chartSwitchOptions = v.visualizationTypes;
        for (const visualizationType of chartSwitchOptions) {
          // todo: wildcard, fuzzy search add
          const isSearchMatch =
            visualizationType.label.toLowerCase().includes(lowercasedSearchTerm) ||
            visualizationType.description?.toLowerCase().includes(lowercasedSearchTerm);
          if (isSearchMatch) {
            let typeId = visualizationType.id;

            if (visualizationType.subtypes) {
              typeId =
                visualizationType.subtypes.find((subtype) => subtype === subVisualizationId) ||
                visualizationType.getCompatibleSubtype?.(subVisualizationId) ||
                visualizationType.subtypes[0];
            }
            const visualizationEntry = {
              ...visualizationType,
              visualizationId,
              selection: getSelection(visualizationId, typeId),
            };
            if (visualizationEntry.isDeprecated) {
              deprecatedChartSwitchPositions.push(visualizationEntry);
            } else {
              chartSwitchPositions.push(visualizationEntry);
            }
            lookup[`${visualizationId}:${visualizationType.id}`] = visualizationEntry;
          }
        }
      });

      const toSelectableEntry = (v: VisChartSwitchPosition): SelectableEntry => {
        const isChecked = subVisualizationId === v.id;
        const dataLossWarning = getDataLossWarning(v.selection.dataLoss);
        return {
          'aria-label': v.label,
          className: 'lnsChartSwitch__option',
          key: `${v.visualizationId}:${v.id}`, // todo: should we simplify?
          value: `${v.visualizationId}:${v.id}`,
          'data-test-subj': `lnsChartSwitchPopover_${v.id}`,
          label: v.label,
          prepend: (
            <EuiFlexItem grow={false}>
              {isChecked && <CheckIcon />}
              {dataLossWarning && (
                <DataLossWarning content={dataLossWarning} id={v.selection.subVisualizationId} />
              )}
              {!dataLossWarning && !isChecked && <EuiIcon type="empty" />}
            </EuiFlexItem>
          ),
          data: {
            description: v.description,
            icon: v.icon,
          },
          append: v.showExperimentalBadge ? <ExperimentalBadge size="m" /> : null,
          // Apparently checked: null is not valid for TS
          ...(isChecked && { checked: 'on' }),
        };
      };

      return {
        visualizationTypes: chartSwitchPositions
          .sort(sortByPriority)
          .map(toSelectableEntry)
          .concat(
            deprecatedChartSwitchPositions.length
              ? [
                  deprecatedGroupChartSwitchElement,
                  ...deprecatedChartSwitchPositions.map(toSelectableEntry),
                ]
              : []
          ),
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
              {i18n.translate('xpack.lens.configPanel.visualizationTypes', {
                defaultMessage: 'Visualization types',
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
        <ChartSwitchSelectable
          className="lnsChartSwitch__options"
          height={computeListHeight(visualizationTypes)}
          data-test-subj="lnsChartSwitchList"
          searchable
          searchProps={{
            compressed: true,
            autoFocus: true,
            className: 'lnsChartSwitch__search',
            'data-test-subj': 'lnsChartSwitchSearch',
            onChange: (value) => setSearchTerm(value),
            placeholder: i18n.translate('xpack.lens.chartSwitch.search', {
              defaultMessage: 'Search visualizations',
            }),
          }}
          renderOption={(option, searchValue) => (
            <ChartOption option={option} searchValue={searchValue} />
          )}
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
            <div
              css={css`
                display: inline;
              `}
            >
              <FormattedMessage
                id="xpack.lens.chartSwitch.noResults"
                defaultMessage="No results found for {term}."
                values={{
                  term: <strong>{searchTerm}</strong>,
                }}
              />
            </div>
          }
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </ChartSwitchSelectable>
      </EuiPopover>
    </div>
  );
});

const ChartSwitchSelectable = (props: EuiSelectableProps) => {
  return (
    <EuiSelectable
      singleSelection
      isPreFiltered
      data-test-subj="lnsChartSwitchList"
      listProps={{
        showIcons: false,
        onFocusBadge: false,
        isVirtualized: false,
        paddingSize: 'none',
      }}
      {...props}
    />
  );
};

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

export const getDataLossWarning = (dataLoss: 'nothing' | 'layers' | 'everything' | 'columns') => {
  if (dataLoss === 'nothing') {
    return;
  }
  if (dataLoss === 'everything') {
    return i18n.translate('xpack.lens.chartSwitch.dataLossEverything', {
      defaultMessage: 'Changing to this visualization clears the current configuration.',
    });
  }
  if (dataLoss === 'layers') {
    return i18n.translate('xpack.lens.chartSwitch.dataLossLayersDescription', {
      defaultMessage:
        'Changing to this visualization modifies currently selected layer`s configuration and removes all other layers.',
    });
  } else
    return i18n.translate('xpack.lens.chartSwitch.dataLossColumns', {
      defaultMessage: `Changing to this visualization modifies the current configuration.`,
    });
};

const CheckIcon = () => {
  const { euiTheme } = useEuiTheme();
  return <EuiIcon type="check" color={euiTheme.colors.darkestShade} />;
};

const DataLossWarning = ({ content, id }: { content?: string; id: string }) => {
  const { euiTheme } = useEuiTheme();
  if (!content) return null;
  return (
    <EuiIconTip
      size="m"
      aria-label={content}
      type="dot"
      color={euiTheme.colors.warning}
      content={content}
      iconProps={{
        className: 'lnsChartSwitch__chartIcon',
        'data-test-subj': `lnsChartSwitchPopoverAlert_${id}`,
      }}
    />
  );
};
