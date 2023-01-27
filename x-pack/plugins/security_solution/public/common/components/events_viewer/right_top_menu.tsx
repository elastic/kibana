/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { TableId } from '../../../../common/types';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { InspectButton } from '../inspect';
import { UpdatedFlexGroup, UpdatedFlexItem } from './styles';
import type { ViewSelection } from './summary_view_select';
import { SummaryViewSelector } from './summary_view_select';

const TitleText = styled.span`
  margin-right: 12px;
`;

interface Props {
  tableView: ViewSelection;
  loading: boolean;
  tableId: TableId;
  title: string;
  onViewChange: (viewSelection: ViewSelection) => void;
  additionalFilters?: React.ReactNode;
  hasRightOffset?: boolean;
  additionalMenuOptions?: React.ReactNode[];
}

export const RightTopMenu = ({
  tableView,
  loading,
  tableId,
  title,
  onViewChange,
  additionalFilters,
  hasRightOffset,
  additionalMenuOptions = [],
}: Props) => {
  const alignItems = tableView === 'gridView' ? 'baseline' : 'center';
  const justTitle = useMemo(() => <TitleText data-test-subj="title">{title}</TitleText>, [title]);

  const tGridEventRenderedViewEnabled = useIsExperimentalFeatureEnabled(
    'tGridEventRenderedViewEnabled'
  );

  const menuOptions = useMemo(
    () =>
      additionalMenuOptions.length
        ? additionalMenuOptions.map((additionalMenuOption, i) => (
            <UpdatedFlexItem grow={false} $show={!loading} key={i}>
              {additionalMenuOption}
            </UpdatedFlexItem>
          ))
        : null,
    [additionalMenuOptions, loading]
  );

  return (
    <UpdatedFlexGroup
      alignItems={alignItems}
      data-test-subj="events-viewer-updated"
      gutterSize="m"
      justifyContent="flexEnd"
      $hasRightOffset={hasRightOffset}
    >
      <UpdatedFlexItem grow={false} $show={!loading}>
        <InspectButton title={justTitle} queryId={tableId} />
      </UpdatedFlexItem>
      <UpdatedFlexItem grow={false} $show={!loading}>
        {additionalFilters}
      </UpdatedFlexItem>
      {tGridEventRenderedViewEnabled &&
        [TableId.alertsOnRuleDetailsPage, TableId.alertsOnAlertsPage].includes(tableId) && (
          <UpdatedFlexItem grow={false} $show={!loading}>
            <SummaryViewSelector viewSelected={tableView} onViewChange={onViewChange} />
          </UpdatedFlexItem>
        )}
      {menuOptions}
    </UpdatedFlexGroup>
  );
};
