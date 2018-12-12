/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isEmpty } from 'lodash';
import { Stackframe } from '../../../../typings/APMDoc';

export interface StackframeCollapsed extends Stackframe {
  libraryFrame?: boolean;
  stackframes?: Stackframe[];
}

export function getCollapsedLibraryFrames(
  stackframes: Stackframe[]
): StackframeCollapsed[] {
  return stackframes.reduce((acc: any, stackframe: StackframeCollapsed) => {
    if (!stackframe.libraryFrame) {
      return [...acc, stackframe];
    }

    // current stackframe is library frame
    const prevItem: StackframeCollapsed = acc[acc.length - 1];
    if (!get(prevItem, 'libraryFrame')) {
      return [...acc, { libraryFrame: true, stackframes: [stackframe] }];
    }

    return [
      ...acc.slice(0, -1),
      {
        ...prevItem,
        stackframes: prevItem.stackframes
          ? [...prevItem.stackframes, stackframe]
          : [stackframe]
      }
    ];
  }, []);
}

export function hasSourceLines(stackframe: Stackframe) {
  return (
    !isEmpty(stackframe.context) || !isEmpty(get(stackframe, 'line.context'))
  );
}
