/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CellActions, CellActionsMode } from '@kbn/cell-actions';
import type { Anomaly } from '../types';
import { Spacer } from '../../page';
import { getScoreString } from './score_health';
import { CELL_ACTIONS_DEFAULT_TRIGGER } from '../../../../../common/constants';

export const ScoreComponent = ({
  index = 0,
  score,
}: {
  index?: number;
  score: Anomaly;
}): JSX.Element => {
  const scoreString = getScoreString(score.severity);

  return (
    <CellActions
      mode={CellActionsMode.HOVER}
      field={{
        name: score.entityName,
        value: score.entityValue,
        type: 'keyword',
      }}
      triggerId={CELL_ACTIONS_DEFAULT_TRIGGER}
      visibleCellActions={5}
    >
      <>
        {index !== 0 && (
          <>
            {','}
            <Spacer />
          </>
        )}
        {scoreString}
      </>
    </CellActions>
  );
};

ScoreComponent.displayName = 'ScoreComponent';

export const Score = React.memo(ScoreComponent);

Score.displayName = 'Score';
