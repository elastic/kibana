/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBottomBar } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DropIdentifier, DraggingIdentifier } from './types';

interface BottomBarProps {
  dragging: DraggingIdentifier;
  activeDropTarget?: DropIdentifier;
}

const DEFAULT_DRAGGING_MESSAGE = i18n.translate('xpack.lens.dragDrop.bottomBar.dragging', {
  defaultMessage: `Drop a configuration to replace an existing one or add to a different dimension.`,
});

const REPLACE_INCOMPATIBLE_MESSAGE = i18n.translate(
  'xpack.lens.dragDrop.bottomBar.replaceIncompatible',
  {
    defaultMessage: `A partial replace can only keep the field, not the function.`,
  }
);

const MOVE_INCOMPATIBLE_MESSAGE = i18n.translate('xpack.lens.dragDrop.bottomBar.moveIncompatible', {
  defaultMessage: `A partial move can only keep the field, not the function.`,
});

const MOVE_COMPATIBLE_MESSAGE = i18n.translate('xpack.lens.dragDrop.bottomBar.moveCompatible', {
  defaultMessage: `Drop to move to new dimension.`,
});

const REPLACE_COMPATIBLE_MESSAGE = i18n.translate(
  'xpack.lens.dragDrop.bottomBar.replaceCompatible',
  {
    defaultMessage: `Drop to replace the existing dimension.`,
  }
);

const REORDER_MESSAGE = i18n.translate('xpack.lens.dragDrop.bottomBar.reorder', {
  defaultMessage: `Drop to reorder.`,
});
const DUPLICATE_INGROUP_MESSAGE = i18n.translate(
  'xpack.lens.dragDrop.bottomBar.duplicateCompatible',
  {
    defaultMessage: `Drop to duplicate.`,
  }
);

const getMessage = ({ activeDropTarget }: BottomBarProps) => {
  if (activeDropTarget) {
    switch (activeDropTarget.dropType) {
      case 'replace_incompatible':
        return REPLACE_INCOMPATIBLE_MESSAGE;
      case 'move_incompatible':
        return MOVE_INCOMPATIBLE_MESSAGE;
      case 'move_compatible':
        return MOVE_COMPATIBLE_MESSAGE;
      case 'replace_compatible':
        return REPLACE_COMPATIBLE_MESSAGE;
      case 'reorder':
        return REORDER_MESSAGE;
      case 'duplicate_compatible':
        return DUPLICATE_INGROUP_MESSAGE;
      case 'duplicate_incompatible':
        return `Duplicate the operation and convert to [nextoperation]`;
      case 'replace_duplicate_incompatible':
        return `Duplicate the operation, convert to [nextoperation] and replace the [existing]`;
      case 'field_add':
        return `Drop a field to add to the chart.`;
      case 'field_replace':
        return `Drop a field to replace the dimension.`;
    }
  }
  return DEFAULT_DRAGGING_MESSAGE;
};

export const BottomBar = ({ dragging, activeDropTarget }: BottomBarProps) => {
  return (
    <EuiBottomBar className="lnsDragDrop-bottomBar" paddingSize="m">
      <span>{getMessage({ dragging, activeDropTarget })}</span>
    </EuiBottomBar>
  );
};
