/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CellActions, CellActionsMode } from '@kbn/ui-actions-plugin/public';
import { SECURITY_SOLUTION_ACTION_TRIGGER } from '../../../../common/constants';

interface Props {
  entityName: string;
  entityValue: string;
}

export const EntityComponent: React.FC<Props> = ({ entityName, entityValue }) => {
  return (
    <CellActions
      field={{
        name: entityName,
        value: entityValue,
        type: 'keyword',
      }}
      triggerId={SECURITY_SOLUTION_ACTION_TRIGGER}
      mode={CellActionsMode.HOVER_POPOVER}
      visibleCellActions={5}
    >
      {`${entityName}: "${entityValue}"`}
    </CellActions>
  );
};

EntityComponent.displayName = 'EntityComponent';

export const Entity = React.memo(EntityComponent);

Entity.displayName = 'Entity';
