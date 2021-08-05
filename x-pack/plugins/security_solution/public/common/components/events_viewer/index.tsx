/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import styled from 'styled-components';

import { isEmpty } from 'lodash/fp';
import { inputsModel, inputsSelectors, State } from '../../store';
import { inputsActions } from '../../store/actions';
import { ControlColumnProps, RowRenderer, TimelineId } from '../../../../common/types/timeline';
import { timelineSelectors, timelineActions } from '../../../timelines/store/timeline';
import type { SubsetTimelineModel, TimelineModel } from '../../../timelines/store/timeline/model';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { Filter } from '../../../../../../../src/plugins/data/public';
import { InspectButtonContainer } from '../inspect';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useSourcererScope } from '../../containers/sourcerer';
import { TGridCellAction } from '../../../../../timelines/common/types';
import { DetailsPanel } from '../../../timelines/components/side_panel';
import { CellValueElementProps } from '../../../timelines/components/timeline/cell_rendering';
import { useKibana } from '../../lib/kibana';
import { defaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { EventsViewer } from './events_viewer';
import * as i18n from './translations';

const EMPTY_CONTROL_COLUMNS: ControlColumnProps[] = [];
const leadingControlColumns: ControlColumnProps[] = [
  {
    ...defaultControlColumn,
    // eslint-disable-next-line react/display-name
    headerCellRender: () => <>{i18n.ACTIONS}</>,
  },
];

const FullScreenContainer = styled.div<{ $isFullScreen: boolean }>`
  height: ${({ $isFullScreen }) => ($isFullScreen ? '100%' : undefined)};
  flex: 1 1 auto;
  display: flex;
  width: 100%;
`;

export interface OwnProps {
  defaultCellActions?: TGridCellAction[];
  defaultModel: SubsetTimelineModel;
  end: string;
  id: TimelineId;
  scopeId: SourcererScopeName;
  start: string;
  showTotalCount?: boolean;
  headerFilterGroup?: React.ReactNode;
  pageFilters?: Filter[];
  currentFilter?: Status;
  onRuleChange?: () => void;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  utilityBar?: (refetch: inputsModel.Refetch, totalCount: number) => React.ReactNode;
}

type Props = OwnProps & PropsFromRedux;

/**
 * The stateful events viewer component is the highest level component that is utilized across the security_solution pages layer where
 * timeline is used BESIDES the flyout. The flyout makes use of the `EventsViewer` component which is a subcomponent here
 * NOTE: As of writting, it is not used in the Case_View component
 */
const StatefulEventsViewerComponent: React.FC<Props> = ({
  createTimeline,
  columns,
  dataProviders,
  defaultCellActions,
  deletedEventIds,
  deleteEventQuery,
  end,
  excludedRowRendererIds,
  filters,
  headerFilterGroup,
  id,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  pageFilters,
  currentFilter,
  onRuleChange,
  query,
  renderCellValue,
  rowRenderers,
  start,
  scopeId,
  showCheckboxes,
  sort,
  utilityBar,
  // If truthy, the graph viewer (Resolver) is showing
  graphEventId,
}) => {
  const { timelines: timelinesUi } = useKibana().services;
  const {
    browserFields,
    docValueFields,
    indexPattern,
    selectedPatterns,
    loading: isLoadingIndexPattern,
  } = useSourcererScope(scopeId);
  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
  // TODO: Once we are past experimental phase this code should be removed
  const tGridEnabled = useIsExperimentalFeatureEnabled('tGridEnabled');
  useEffect(() => {
    if (createTimeline != null) {
      createTimeline({
        id,
        columns,
        excludedRowRendererIds,
        indexNames: selectedPatterns,
        sort,
        itemsPerPage,
        showCheckboxes,
      });
    }
    return () => {
      deleteEventQuery({ id, inputId: 'global' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const globalFilters = useMemo(() => [...filters, ...(pageFilters ?? [])], [filters, pageFilters]);
  const trailingControlColumns: ControlColumnProps[] = EMPTY_CONTROL_COLUMNS;

  return (
    <>
      <FullScreenContainer $isFullScreen={globalFullScreen}>
        <InspectButtonContainer>
          {tGridEnabled ? (
            timelinesUi.getTGrid<'embedded'>({
              type: 'embedded',
              browserFields,
              columns,
              dataProviders: dataProviders!,
              defaultCellActions,
              deletedEventIds,
              docValueFields,
              end,
              filters: globalFilters,
              globalFullScreen,
              headerFilterGroup,
              id,
              indexNames: selectedPatterns,
              indexPattern,
              isLive,
              isLoadingIndexPattern,
              itemsPerPage,
              itemsPerPageOptions: itemsPerPageOptions!,
              kqlMode,
              query,
              onRuleChange,
              renderCellValue,
              rowRenderers,
              setGlobalFullScreen,
              start,
              sort,
              utilityBar,
              graphEventId,
              filterStatus: currentFilter,
              leadingControlColumns,
              trailingControlColumns,
            })
          ) : (
            <EventsViewer
              browserFields={browserFields}
              columns={columns}
              docValueFields={docValueFields}
              id={id}
              dataProviders={dataProviders!}
              deletedEventIds={deletedEventIds}
              end={end}
              isLoadingIndexPattern={isLoadingIndexPattern}
              filters={globalFilters}
              headerFilterGroup={headerFilterGroup}
              indexNames={selectedPatterns}
              indexPattern={indexPattern}
              isLive={isLive}
              itemsPerPage={itemsPerPage!}
              itemsPerPageOptions={itemsPerPageOptions!}
              kqlMode={kqlMode}
              query={query}
              onRuleChange={onRuleChange}
              renderCellValue={renderCellValue}
              rowRenderers={rowRenderers}
              start={start}
              sort={sort}
              showTotalCount={isEmpty(graphEventId) ? true : false}
              utilityBar={utilityBar}
              graphEventId={graphEventId}
            />
          )}
        </InspectButtonContainer>
      </FullScreenContainer>
      <DetailsPanel
        browserFields={browserFields}
        docValueFields={docValueFields}
        isFlyoutView
        timelineId={id}
      />
    </>
  );
};

const makeMapStateToProps = () => {
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State, { id, defaultModel }: OwnProps) => {
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const timeline: TimelineModel = getTimeline(state, id) ?? defaultModel;
    const {
      columns,
      dataProviders,
      deletedEventIds,
      excludedRowRendererIds,
      graphEventId,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      sort,
      showCheckboxes,
    } = timeline;

    return {
      columns,
      dataProviders,
      deletedEventIds,
      excludedRowRendererIds,
      filters: getGlobalFiltersQuerySelector(state),
      id,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      query: getGlobalQuerySelector(state),
      sort,
      showCheckboxes,
      // Used to determine whether the footer should show (since it is hidden if the graph is showing.)
      // `getTimeline` actually returns `TimelineModel | undefined`
      graphEventId,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  createTimeline: timelineActions.createTimeline,
  deleteEventQuery: inputsActions.deleteOneQuery,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulEventsViewer = connector(
  React.memo(
    StatefulEventsViewerComponent,
    // eslint-disable-next-line complexity
    (prevProps, nextProps) =>
      prevProps.id === nextProps.id &&
      prevProps.scopeId === nextProps.scopeId &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      prevProps.defaultCellActions === nextProps.defaultCellActions &&
      deepEqual(prevProps.excludedRowRendererIds, nextProps.excludedRowRendererIds) &&
      prevProps.deletedEventIds === nextProps.deletedEventIds &&
      prevProps.end === nextProps.end &&
      deepEqual(prevProps.filters, nextProps.filters) &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      prevProps.kqlMode === nextProps.kqlMode &&
      deepEqual(prevProps.query, nextProps.query) &&
      prevProps.renderCellValue === nextProps.renderCellValue &&
      prevProps.rowRenderers === nextProps.rowRenderers &&
      deepEqual(prevProps.sort, nextProps.sort) &&
      prevProps.start === nextProps.start &&
      deepEqual(prevProps.pageFilters, nextProps.pageFilters) &&
      prevProps.showCheckboxes === nextProps.showCheckboxes &&
      prevProps.start === nextProps.start &&
      prevProps.utilityBar === nextProps.utilityBar &&
      prevProps.graphEventId === nextProps.graphEventId
  )
);
