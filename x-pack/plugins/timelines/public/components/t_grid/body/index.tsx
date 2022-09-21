/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useState } from 'react';
import { Filter } from '@kbn/es-query';
import { FieldBrowserOptions } from '@kbn/triggers-actions-ui-plugin/public';

import {
  TGridCellAction,
  BulkActionsProp,
  CellValueElementProps,
  ControlColumnProps,
  RowRenderer,
  AlertStatus,
  TimelineTabs,
} from '../../../../common/types/timeline';
import type { TimelineItem } from '../../../../common/search_strategy/timeline';
import type { BrowserFields } from '../../../../common/search_strategy/index_fields';
import type { Refetch } from '../../../store/t_grid/inputs';
import { Ecs } from '../../../../common/ecs';
import { ViewSelection } from '../event_rendered_view/selector';
import { StatefulEventContext } from '../../stateful_event_context';

const StatefulGridBody = lazy(async () => import('./grid'));
const StatefuEventRenderedBody = lazy(async () => import('./event_rendered'));

// NEXT UP:
// - Move fetching into Grid / Event Rendered (one uses useTimeline blah, one should only use the generated query)
// - remove unused props

export interface StatefulBodyProps {
  activePage: number;
  additionalControls?: React.ReactNode;
  appId?: string;
  browserFields: BrowserFields;
  bulkActions?: BulkActionsProp;
  data: TimelineItem[];
  defaultCellActions?: TGridCellAction[];
  disabledCellActions: string[];
  fieldBrowserOptions?: FieldBrowserOptions;
  filters?: Filter[];
  filterQuery?: string;
  filterStatus?: AlertStatus;
  getRowRenderer?: ({
    data,
    rowRenderers,
  }: {
    data: Ecs;
    rowRenderers: RowRenderer[];
  }) => RowRenderer | null;
  id: string;
  indexNames: string[];
  isEventViewer?: boolean;
  itemsPerPageOptions: number[];
  leadingControlColumns?: ControlColumnProps[];
  loadPage: (newActivePage: number) => void;
  onRuleChange?: () => void;
  pageSize: number;
  refetch: Refetch;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  tableView: ViewSelection;
  tabType: TimelineTabs;
  totalItems: number;
  unit?: (total: number) => React.ReactNode;
  hasAlertsCrud?: boolean;
  hasAlertsCrudPermissions?: ({
    ruleConsumer,
    ruleProducer,
  }: {
    ruleConsumer: string;
    ruleProducer?: string;
  }) => boolean;
  totalSelectAllAlerts?: number;
  showCheckboxes?: boolean;
}

/**
 * The Body component is used everywhere timeline is used within the security application. It is the highest level component
 * that is shared across all implementations of the timeline.
 */

export const BodyComponent = React.memo<StatefulBodyProps>(
  ({ tableView = 'gridView', ...props }) => {
    // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
    const [activeStatefulEventContext] = useState({
      timelineID: props.id,
      tabType: props.tabType,
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
    });

    let component = null;
    switch (tableView) {
      case 'gridView':
        component = <StatefulGridBody {...props} />;
        break;
      case 'eventRenderedView':
        component = <StatefuEventRenderedBody {...props} />;
        break;
    }

    return (
      <StatefulEventContext.Provider value={activeStatefulEventContext}>
        {component}
      </StatefulEventContext.Provider>
    );
  }
);

BodyComponent.displayName = 'BodyComponent';
