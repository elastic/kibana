/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isEmpty } from 'lodash';
import { Stackframe } from '../../../../typings/APMDoc';

interface StackframesGroup {
  isLibraryFrame: boolean;
  stackframes: Stackframe[];
}

export function getGroupedStackframes(
  stackframes: Stackframe[]
): StackframesGroup[] {
  if (stackframes.length === 0) {
    return [];
  }

  const isLibraryFrame = Boolean(stackframes[0].library_frame);

  let i = 0;
  while (
    i < stackframes.length &&
    isLibraryFrame === stackframes[i].library_frame &&
    !stackframes[i].exclude_from_grouping
  ) {
    i++;
  }

  const stackFrameEndIndex = i || 1;

  return [
    { isLibraryFrame, stackframes: stackframes.slice(0, stackFrameEndIndex) },
    ...getGroupedStackframes(stackframes.slice(stackFrameEndIndex))
  ];
}

export function hasSourceLines(stackframe: Stackframe) {
  return (
    !isEmpty(stackframe.context) || !isEmpty(get(stackframe, 'line.context'))
  );
}
