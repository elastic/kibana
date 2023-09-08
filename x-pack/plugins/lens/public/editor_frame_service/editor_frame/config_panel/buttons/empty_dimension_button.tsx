/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  DragDrop,
  DragDropIdentifier,
  useDragDropContext,
  DropType,
  DropTargetSwapDuplicateCombine,
} from '@kbn/dom-drag-drop';
import { EmptyDimensionButton as EmptyDimensionButtonInner } from '@kbn/visualization-ui-components';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { isDraggedField } from '../../../../utils';
import { generateId } from '../../../../id_generator';

import {
  Datasource,
  VisualizationDimensionGroupConfig,
  DatasourceLayers,
  isOperation,
  IndexPatternMap,
  DragDropOperation,
  Visualization,
} from '../../../../types';

interface EmptyButtonProps {
  columnId: string;
  onClick: (id: string) => void;
  group: VisualizationDimensionGroupConfig;
  labels?: {
    ariaLabel: (label: string) => string;
    label: JSX.Element | string;
  };
}

const defaultButtonLabels = {
  ariaLabel: (l: string) =>
    i18n.translate('xpack.lens.indexPattern.addColumnAriaLabel', {
      defaultMessage: 'Add or drag-and-drop a field to {groupLabel}',
      values: { groupLabel: l },
    }),
  label: (
    <FormattedMessage
      id="xpack.lens.configure.emptyConfig"
      defaultMessage="Add or drag-and-drop a field"
    />
  ),
};

const DefaultEmptyButton = ({ columnId, group, onClick }: EmptyButtonProps) => {
  const { buttonAriaLabel, buttonLabel } = group.labels || {};
  return (
    <EmptyDimensionButtonInner
      label={buttonLabel || defaultButtonLabels.label}
      ariaLabel={buttonAriaLabel || defaultButtonLabels.ariaLabel(group.groupLabel)}
      dataTestSubj="lns-empty-dimension"
      onClick={() => onClick(columnId)}
    />
  );
};

const SuggestedValueButton = ({ columnId, group, onClick }: EmptyButtonProps) => (
  <EmptyDimensionButtonInner
    label={
      <FormattedMessage
        id="xpack.lens.configure.suggestedValuee"
        defaultMessage="Suggested value: {value}"
        values={{ value: group.suggestedValue?.() }}
      />
    }
    ariaLabel={i18n.translate('xpack.lens.indexPattern.suggestedValueAriaLabel', {
      defaultMessage: 'Suggested value: {value} for {groupLabel}',
      values: { value: group.suggestedValue?.(), groupLabel: group.groupLabel },
    })}
    dataTestSubj="lns-empty-dimension-suggested-value"
    iconType="plusInCircleFilled"
    onClick={() => onClick(columnId)}
  />
);

export function EmptyDimensionButton({
  group,
  layerDatasource,
  state,
  onClick,
  onDrop,
  datasourceLayers,
  indexPatterns,
  activeVisualization,
  order,
  target,
}: {
  order: [2, number, number, number];
  group: VisualizationDimensionGroupConfig;
  layerDatasource?: Datasource<unknown, unknown>;
  datasourceLayers: DatasourceLayers;
  state: unknown;
  onDrop: (source: DragDropIdentifier, dropTarget: DragDropIdentifier, dropType?: DropType) => void;
  onClick: (id: string) => void;
  indexPatterns: IndexPatternMap;
  activeVisualization: Visualization<unknown, unknown>;
  target: Omit<DragDropOperation, 'columnId'> & {
    humanData: {
      groupLabel: string;
      position: number;
      layerNumber: number;
      label: string;
    };
  };
}) {
  const [{ dragging }] = useDragDropContext();

  let getDropProps;

  if (dragging) {
    if (!layerDatasource) {
      getDropProps = activeVisualization.getDropProps;
    } else if (
      isDraggedField(dragging) ||
      (isOperation(dragging) &&
        layerDatasource &&
        datasourceLayers?.[dragging.layerId]?.datasourceId ===
          datasourceLayers?.[target.layerId]?.datasourceId)
    ) {
      getDropProps = layerDatasource.getDropProps;
    }
  }

  const [newColumnId, setNewColumnId] = useState<string>(generateId());
  useEffect(() => {
    setNewColumnId(generateId());
  }, [group.accessors.length]);

  const { dropTypes, nextLabel } = getDropProps?.({
    state,
    source: dragging,
    target: {
      ...target,
      columnId: newColumnId,
    },
    indexPatterns,
  }) || { dropTypes: [], nextLabel: '' };

  const canDuplicate = !!(
    dropTypes.includes('duplicate_compatible') || dropTypes.includes('duplicate_incompatible')
  );

  const value = useMemo(
    () => ({
      ...target,
      columnId: newColumnId,
      id: newColumnId,
      humanData: {
        ...target.humanData,
        nextLabel: nextLabel || '',
        canDuplicate,
      },
    }),
    [newColumnId, target, nextLabel, canDuplicate]
  );

  const handleOnDrop = React.useCallback(
    (source, selectedDropType) => onDrop(source, value, selectedDropType),
    [value, onDrop]
  );

  const buttonProps: EmptyButtonProps = {
    columnId: value.columnId,
    onClick,
    group,
  };

  return (
    <div className="lnsLayerPanel__dimensionContainer" data-test-subj={group.dataTestSubj}>
      <DragDrop
        getCustomDropTarget={DropTargetSwapDuplicateCombine.getCustomDropTarget}
        getAdditionalClassesOnDroppable={
          DropTargetSwapDuplicateCombine.getAdditionalClassesOnDroppable
        }
        value={value}
        order={order}
        onDrop={handleOnDrop}
        dropTypes={dropTypes}
      >
        <div
          css={css`
            border-radius: ${euiThemeVars.euiBorderRadius};
          `}
        >
          {typeof group.suggestedValue?.() === 'number' ? (
            <SuggestedValueButton {...buttonProps} />
          ) : (
            <DefaultEmptyButton {...buttonProps} />
          )}
        </div>
      </DragDrop>
    </div>
  );
}
