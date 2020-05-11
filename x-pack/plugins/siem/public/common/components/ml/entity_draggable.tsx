/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DraggableWrapper, DragEffects } from '../drag_and_drop/draggable_wrapper';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';
import { escapeDataProviderId } from '../drag_and_drop/helpers';

interface Props {
  idPrefix: string;
  entityName: string;
  entityValue: string;
}

export const EntityDraggableComponent = ({
  idPrefix,
  entityName,
  entityValue,
}: Props): JSX.Element => {
  const id = escapeDataProviderId(`entity-draggable-${idPrefix}-${entityName}-${entityValue}`);
  return (
    <DraggableWrapper
      key={id}
      dataProvider={{
        and: [],
        enabled: true,
        id,
        name: entityValue,
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: entityName,
          value: entityValue,
          operator: IS_OPERATOR,
        },
      }}
      render={(dataProvider, _, snapshot) =>
        snapshot.isDragging ? (
          <DragEffects>
            <Provider dataProvider={dataProvider} />
          </DragEffects>
        ) : (
          <>{`${entityName}: "${entityValue}"`}</>
        )
      }
    />
  );
};

EntityDraggableComponent.displayName = 'EntityDraggableComponent';

export const EntityDraggable = React.memo(EntityDraggableComponent);

EntityDraggable.displayName = 'EntityDraggable';
