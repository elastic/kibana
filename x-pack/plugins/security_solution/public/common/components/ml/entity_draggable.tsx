/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { DraggableWrapper, DragEffects } from '../drag_and_drop/draggable_wrapper';
import {
  IS_OPERATOR,
  QueryOperator,
} from '../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';
import { escapeDataProviderId } from '../drag_and_drop/helpers';

interface Props {
  idPrefix: string;
  entityName: string;
  entityValue: string;
}

export const EntityDraggableComponent: React.FC<Props> = ({
  idPrefix,
  entityName,
  entityValue,
}) => {
  const id = escapeDataProviderId(`entity-draggable-${idPrefix}-${entityName}-${entityValue}`);

  const dataProviderProp = useMemo(
    () => ({
      and: [],
      enabled: true,
      id,
      name: entityValue,
      excluded: false,
      kqlQuery: '',
      queryMatch: {
        field: entityName,
        value: entityValue,
        operator: IS_OPERATOR as QueryOperator,
      },
    }),
    [entityName, entityValue, id]
  );

  const render = useCallback(
    (dataProvider, _, snapshot) =>
      snapshot.isDragging ? (
        <DragEffects>
          <Provider dataProvider={dataProvider} />
        </DragEffects>
      ) : (
        <>{`${entityName}: "${entityValue}"`}</>
      ),
    [entityName, entityValue]
  );

  return <DraggableWrapper key={id} dataProvider={dataProviderProp} render={render} />;
};

EntityDraggableComponent.displayName = 'EntityDraggableComponent';

export const EntityDraggable = React.memo(EntityDraggableComponent);

EntityDraggable.displayName = 'EntityDraggable';
