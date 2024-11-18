/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import React, { useState, useMemo, useCallback } from 'react';
import { EuiSpacer, EuiHealth, EuiCodeBlock } from '@elastic/eui';
import { BasicTable } from '../../../../../../common/components/ml/tables/basic_table';
import { useColumns } from '../hooks/use_columns';
import type { EngineComponentStatus } from '../../../../../../../common/api/entity_analytics';

type ExpandedRowMap = Record<string, ReactNode>;

const componentToId = ({ id, resource }: EngineComponentStatus) => `${resource}-${id}`;

export const EngineComponentsStatusTable = ({
  components,
}: {
  components: EngineComponentStatus[];
}) => {
  const [expandedItems, setExpandedItems] = useState<EngineComponentStatus[]>([]);

  const itemIdToExpandedRowMap: ExpandedRowMap = useMemo(() => {
    return expandedItems.reduce<ExpandedRowMap>((acc, componentStatus) => {
      if (componentStatus.errors && componentStatus.errors.length > 0) {
        acc[componentToId(componentStatus)] = (
          <TransformExtendedData errors={componentStatus.errors} />
        );
      }
      return acc;
    }, {});
  }, [expandedItems]);

  const onToggle = useCallback(
    (component: EngineComponentStatus) => {
      const isItemExpanded = expandedItems.includes(component);

      if (isItemExpanded) {
        setExpandedItems(expandedItems.filter((item) => component !== item));
      } else {
        setExpandedItems([...expandedItems, component]);
      }
    },
    [expandedItems]
  );

  const columns = useColumns(onToggle, expandedItems);

  return (
    <BasicTable
      data-test-subj="engine-components-status-table"
      columns={columns}
      itemId={componentToId}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      items={components}
    />
  );
};

const TransformExtendedData = ({ errors }: { errors: EngineComponentStatus['errors'] }) => {
  return (
    <>
      {errors?.map(({ title, message }) => (
        <>
          <EuiSpacer size="m" />
          <EuiHealth color="danger">{title}</EuiHealth>
          <EuiSpacer size="s" />
          <EuiCodeBlock>{message}</EuiCodeBlock>
        </>
      ))}
    </>
  );
};
