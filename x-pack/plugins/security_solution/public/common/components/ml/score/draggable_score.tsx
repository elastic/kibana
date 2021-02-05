/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { DraggableWrapper, DragEffects } from '../../drag_and_drop/draggable_wrapper';
import { Anomaly } from '../types';
import {
  IS_OPERATOR,
  QueryOperator,
} from '../../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../../timelines/components/timeline/data_providers/provider';
import { Spacer } from '../../page';
import { getScoreString } from './score_health';

export const DraggableScoreComponent = ({
  id,
  index = 0,
  score,
}: {
  id: string;
  index?: number;
  score: Anomaly;
}): JSX.Element => {
  const scoreString = getScoreString(score.severity);

  const dataProviderProp = useMemo(
    () => ({
      and: [],
      enabled: true,
      id,
      name: score.entityName,
      excluded: false,
      kqlQuery: '',
      queryMatch: {
        field: score.entityName,
        value: score.entityValue,
        operator: IS_OPERATOR as QueryOperator,
      },
    }),
    [id, score.entityName, score.entityValue]
  );

  const render = useCallback(
    (dataProvider, _, snapshot) =>
      snapshot.isDragging ? (
        <DragEffects>
          <Provider dataProvider={dataProvider} />
        </DragEffects>
      ) : (
        <>
          {index !== 0 && (
            <>
              {','}
              <Spacer />
            </>
          )}
          {scoreString}
        </>
      ),
    [index, scoreString]
  );

  return (
    <DraggableWrapper
      key={`draggable-score-draggable-wrapper-${id}`}
      dataProvider={dataProviderProp}
      render={render}
    />
  );
};

DraggableScoreComponent.displayName = 'DraggableScoreComponent';

export const DraggableScore = React.memo(DraggableScoreComponent);

DraggableScore.displayName = 'DraggableScore';
