/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext, useEffect } from 'react';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import {
  BulkActionsState,
  BulkActionsVerbs,
  RenderBulkActions,
  UseBulkActionsRegistry,
} from '../../../../types';
import { BulkActionsContext } from '../bulk_actions/context';
import {
  getLeadingControlColumn as getBulkActionsLeadingControlColumn,
  GetLeadingControlColumn,
} from '../bulk_actions/get_leading_control_column';

interface BulkActionsProps {
  alerts: EcsFieldsResponse[];
  useBulkActionsConfig?: UseBulkActionsRegistry;
}

export interface UseBulkActions {
  isBulkActionsColumnActive: boolean;
  getBulkActionsLeadingControlColumn: GetLeadingControlColumn;
  bulkActionsState: BulkActionsState;
  renderBulkActions: RenderBulkActions;
}

export function useBulkActions({
  alerts,
  useBulkActionsConfig = () => ({ render: undefined }),
}: BulkActionsProps): UseBulkActions {
  const [bulkActionsState, updateBulkActionsState] = useContext(BulkActionsContext);
  const { render: renderBulkActions } = useBulkActionsConfig();

  const isBulkActionsColumnActive = Boolean(renderBulkActions);

  useEffect(() => {
    updateBulkActionsState({ action: BulkActionsVerbs.rowCountUpdate, rowCount: alerts.length });
  }, [alerts, updateBulkActionsState]);

  return {
    isBulkActionsColumnActive,
    getBulkActionsLeadingControlColumn,
    bulkActionsState,
    renderBulkActions,
  };
}
