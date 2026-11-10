/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asDuration, PercentOfParent } from '@kbn/apm-ui-shared';
import React from 'react';

/**
 * The duration of a waterfall item, followed by its share of the parent's duration when that is
 * known. Unlike `Duration` from `@kbn/apm-ui-shared`, it renders inline so it inherits the text
 * styles of the header block it sits in.
 */
export function WaterfallItemDuration({
  duration,
  parentDuration,
  parentType,
}: {
  duration: number;
  parentDuration?: number;
  parentType: 'trace' | 'transaction';
}) {
  return (
    <span>
      {asDuration(duration)}
      {parentDuration ? (
        <>
          {' '}
          &nbsp;
          <PercentOfParent
            duration={duration}
            totalDuration={parentDuration}
            parentType={parentType}
          />
        </>
      ) : null}
    </span>
  );
}
