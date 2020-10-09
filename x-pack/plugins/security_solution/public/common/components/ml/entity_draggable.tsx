/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import {
  IS_OPERATOR,
  QueryOperator,
} from '../../../timelines/components/timeline/data_providers/data_provider';
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

  const content = useMemo(() => <>{`${entityName}: "${entityValue}"`}</>, [
    entityName,
    entityValue,
  ]);

  return (
    <DraggableWrapper key={id} dataProvider={dataProviderProp}>
      {content}
    </DraggableWrapper>
  );
};

EntityDraggableComponent.displayName = 'EntityDraggableComponent';

export const EntityDraggable = React.memo(EntityDraggableComponent);

EntityDraggable.displayName = 'EntityDraggable';
