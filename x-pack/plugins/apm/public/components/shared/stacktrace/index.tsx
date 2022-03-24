/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isEmpty, last } from 'lodash';
import React, { Fragment } from 'react';
import { Stackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';
import { EmptyMessage } from '../../shared/empty_message';
import { LibraryStacktrace } from './library_stacktrace';
import { Stackframe as StackframeComponent } from './stackframe';

interface Props {
  stackframes?: Stackframe[];
  codeLanguage?: string;
}

export function Stacktrace({ stackframes = [], codeLanguage }: Props) {
  if (isEmpty(stackframes)) {
    return (
      <EmptyMessage
        heading={i18n.translate(
          'xpack.apm.stacktraceTab.noStacktraceAvailableLabel',
          {
            defaultMessage: 'No stack trace available.',
          }
        )}
        hideSubheading
      />
    );
  }

  const groups = getGroupedStackframes(stackframes);

  return (
    <Fragment>
      {groups.map((group, i) => {
        // library frame
        if (group.isLibraryFrame && groups.length > 1) {
          return (
            <Fragment key={i}>
              <LibraryStacktrace
                id={i.toString()}
                stackframes={group.stackframes}
                codeLanguage={codeLanguage}
              />
            </Fragment>
          );
        }

        // non-library frame
        return group.stackframes.map((stackframe, idx) => (
          <Fragment key={`${i}-${idx}`}>
            <StackframeComponent
              codeLanguage={codeLanguage}
              id={`${i}-${idx}`}
              initialIsOpen={i === 0 && groups.length > 1}
              stackframe={stackframe}
            />
          </Fragment>
        ));
      })}
    </Fragment>
  );
}

interface StackframesGroup {
  isLibraryFrame: boolean;
  excludeFromGrouping: boolean;
  stackframes: Stackframe[];
}

export function getGroupedStackframes(stackframes: Stackframe[]) {
  return stackframes.reduce((acc, stackframe) => {
    const prevGroup = last(acc);
    const shouldAppend =
      prevGroup &&
      prevGroup.isLibraryFrame === stackframe.library_frame &&
      !prevGroup.excludeFromGrouping &&
      !stackframe.exclude_from_grouping;

    // append to group
    if (prevGroup && shouldAppend) {
      prevGroup.stackframes.push(stackframe);
      return acc;
    }

    // create new group
    acc.push({
      isLibraryFrame: Boolean(stackframe.library_frame),
      excludeFromGrouping: Boolean(stackframe.exclude_from_grouping),
      stackframes: [stackframe],
    });
    return acc;
  }, [] as StackframesGroup[]);
}
