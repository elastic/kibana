/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import styled from 'styled-components';

import { manageQuery } from '../../../../common/components/page/manage_query';

import type {
  StatItemsProps,
  StatItems,
} from '../../../../common/components/stat_items_with_embeddables';
import {
  StatItemsComponent,
  useKpiMatrixStatus,
} from '../../../../common/components/stat_items_with_embeddables';

const kpiWidgetHeight = 247;

export const FlexGroup = styled(EuiFlexGroup)`
  min-height: ${kpiWidgetHeight}px;
`;

FlexGroup.displayName = 'FlexGroup';

interface KpiBaseComponentProps {
  fieldsMapping: Readonly<StatItems[]>;
  id: string;
  from: string;
  to: string;
}

export const KpiBaseComponent = React.memo<KpiBaseComponentProps>(
  ({ fieldsMapping, id, from, to }) => {
    const statItemsProps: StatItemsProps[] = useKpiMatrixStatus(fieldsMapping, id, from, to);

    return (
      <EuiFlexGroup wrap>
        {statItemsProps.map((mappedStatItemProps) => (
          <StatItemsComponent {...mappedStatItemProps} />
        ))}
      </EuiFlexGroup>
    );
  },
  (prevProps, nextProps) =>
    prevProps.fieldsMapping === nextProps.fieldsMapping &&
    prevProps.id === nextProps.id &&
    prevProps.from === nextProps.from &&
    prevProps.to === nextProps.to
);

KpiBaseComponent.displayName = 'KpiBaseComponent';

export const KpiBaseComponentManage = manageQuery(KpiBaseComponent);
