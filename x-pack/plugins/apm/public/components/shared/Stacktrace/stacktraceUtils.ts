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

function getNextGroupIndex(stackframes: Stackframe[]): number {
  const isLibraryFrame = Boolean(stackframes[0].library_frame);
  const groupEndIndex =
    stackframes.findIndex(
      stackframe =>
        isLibraryFrame !== Boolean(stackframe.library_frame) ||
        Boolean(stackframe.exclude_from_grouping)
    ) || 1;
  return groupEndIndex === -1 ? stackframes.length : groupEndIndex;
}

export function getGroupedStackframes(
  stackframes: Stackframe[]
): StackframesGroup[] {
  if (stackframes.length === 0) {
    return [];
  }

  const nextGroupIndex = getNextGroupIndex(stackframes);

  return [
    {
      isLibraryFrame: Boolean(stackframes[0].library_frame),
      stackframes: stackframes.slice(0, nextGroupIndex)
    },
    ...getGroupedStackframes(stackframes.slice(nextGroupIndex))
  ];
}

export function hasSourceLines(stackframe: Stackframe) {
  return (
    !isEmpty(stackframe.context) || !isEmpty(get(stackframe, 'line.context'))
  );
}
