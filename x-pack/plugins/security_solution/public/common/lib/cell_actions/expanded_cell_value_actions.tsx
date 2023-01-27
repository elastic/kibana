/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useMemo, useState, useCallback } from 'react';
import styled from 'styled-components';
import type { Filter } from '@kbn/es-query';
import type { ColumnHeaderOptions } from '../../../../common/types';
import { allowTopN } from '../../components/drag_and_drop/helpers';
import { ShowTopNButton } from '../../components/hover_actions/actions/show_top_n';
import { SHOW_TOP_VALUES, HIDE_TOP_VALUES } from './translations';

interface Props {
  field: ColumnHeaderOptions;
  globalFilters?: Filter[];
  scopeId: string;
  value: string[] | undefined;
  onFilterAdded?: () => void;
}

const StyledContent = styled.div<{ $isDetails: boolean }>`
  border-bottom: 1px solid #d3dae6;
  padding: ${({ $isDetails }) => ($isDetails ? '0 8px' : undefined)};
`;

const ExpandedCellValueActionsComponent: React.FC<Props> = ({
  field,
  globalFilters,
  onFilterAdded,
  scopeId,
  value,
}) => {
  const showButton = useMemo(
    () =>
      allowTopN({
        fieldName: field.id,
        fieldType: field.type ?? '',
        isAggregatable: field.aggregatable ?? false,
        hideTopN: false,
      }),
    [field]
  );

  const [showTopN, setShowTopN] = useState(false);
  const onClick = useCallback(() => setShowTopN(!showTopN), [showTopN]);

  return (
    <>
      <StyledContent $isDetails data-test-subj="data-grid-expanded-cell-value-actions">
        {showButton ? (
          <ShowTopNButton
            className="eui-displayBlock expandable-top-value-button"
            Component={EuiButtonEmpty}
            data-test-subj="data-grid-expanded-show-top-n"
            field={field.id}
            flush="both"
            globalFilters={globalFilters}
            iconSide="right"
            iconType={showTopN ? 'arrowUp' : 'arrowDown'}
            isExpandable
            onClick={onClick}
            onFilterAdded={onFilterAdded ?? noop}
            ownFocus={false}
            paddingSize="none"
            showLegend
            showTopN={showTopN}
            showTooltip={false}
            scopeId={scopeId}
            title={showTopN ? HIDE_TOP_VALUES : SHOW_TOP_VALUES}
            value={value}
          />
        ) : null}
      </StyledContent>
    </>
  );
};

ExpandedCellValueActionsComponent.displayName = 'ExpandedCellValueActionsComponent';

export const ExpandedCellValueActions = React.memo(ExpandedCellValueActionsComponent);
