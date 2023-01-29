/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { CSSProperties } from 'styled-components';
import styled from 'styled-components';
import type { ViewSelection } from '../../../../common/types';
import { TableId } from '../../../../common/types';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { InspectButton } from '../inspect';
import { UpdatedFlexGroup, UpdatedFlexItem } from './styles';
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
  showInspect?: boolean;
  position?: CSSProperties['position'];
}

export const RightTopMenu = ({
  tableView,
  loading,
  tableId,
  title,
  onViewChange,
  additionalFilters,
  hasRightOffset,
  showInspect = true,
  position = 'absolute',
}: Props) => {
  const alignItems = tableView === 'gridView' ? 'baseline' : 'center';
  const justTitle = useMemo(() => <TitleText data-test-subj="title">{title}</TitleText>, [title]);

  const tGridEventRenderedViewEnabled = useIsExperimentalFeatureEnabled(
    'tGridEventRenderedViewEnabled'
  );
  return (
    <UpdatedFlexGroup
      alignItems={alignItems}
      data-test-subj="events-viewer-updated"
      gutterSize="m"
      component="span"
      justifyContent="flexEnd"
      direction="row"
      $hasRightOffset={hasRightOffset}
      position={position}
    >
      {showInspect ? (
        <UpdatedFlexItem grow={false} $show={!loading}>
          <InspectButton title={justTitle} queryId={tableId} />
        </UpdatedFlexItem>
      ) : null}
      <UpdatedFlexItem grow={false} $show={!loading}>
        {additionalFilters}
      </UpdatedFlexItem>
      {tGridEventRenderedViewEnabled &&
        [TableId.alertsOnRuleDetailsPage, TableId.alertsOnAlertsPage].includes(tableId) && (
          <UpdatedFlexItem grow={false} $show={!loading}>
            <SummaryViewSelector viewSelected={tableView} onViewChange={onViewChange} />
          </UpdatedFlexItem>
        )}
    </UpdatedFlexGroup>
  );
};
