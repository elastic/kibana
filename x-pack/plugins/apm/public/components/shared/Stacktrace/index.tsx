/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, last } from 'lodash';
import React, { Fragment } from 'react';
import { IStackframe } from '../../../../typings/es_schemas/Stackframe';
import { EmptyMessage } from '../../shared/EmptyMessage';
// @ts-ignore
import { Ellipsis } from '../../shared/Icons';
import { LibraryStackFrames } from './LibraryStackFrames';
import { Stackframe } from './Stackframe';

interface Props {
  stackframes?: IStackframe[];
  codeLanguage?: string;
}

export function Stacktrace({ stackframes = [], codeLanguage }: Props) {
  if (isEmpty(stackframes)) {
    return <EmptyMessage heading="No stacktrace available." hideSubheading />;
  }

  const groups = getGroupedStackframes(stackframes);
  return (
    <Fragment>
      {groups.map((group, i) => {
        // library frame
        if (group.isLibraryFrame) {
          const initialVisiblity = groups.length === 1; // if there is only a single group it should be visible initially
          return (
            <LibraryStackFrames
              key={i}
              initialVisiblity={initialVisiblity}
              stackframes={group.stackframes}
              codeLanguage={codeLanguage}
            />
          );
        }

        // non-library frame
        return group.stackframes.map((stackframe, idx) => (
          <Stackframe
            key={`${i}-${idx}`}
            codeLanguage={codeLanguage}
            stackframe={stackframe}
          />
        ));
      })}
    </Fragment>
  );
}

interface StackframesGroup {
  isLibraryFrame: boolean;
  excludeFromGrouping: boolean;
  stackframes: IStackframe[];
}

export function getGroupedStackframes(stackframes: IStackframe[]) {
  return stackframes.reduce(
    (acc, stackframe) => {
      const prevGroup = last(acc);
      const shouldAppend =
        prevGroup &&
        prevGroup.isLibraryFrame === stackframe.library_frame &&
        !prevGroup.excludeFromGrouping &&
        !stackframe.exclude_from_grouping;

      // append to group
      if (shouldAppend) {
        prevGroup.stackframes.push(stackframe);
        return acc;
      }

      // create new group
      acc.push({
        isLibraryFrame: Boolean(stackframe.library_frame),
        excludeFromGrouping: Boolean(stackframe.exclude_from_grouping),
        stackframes: [stackframe]
      });
      return acc;
    },
    [] as StackframesGroup[]
  );
}
