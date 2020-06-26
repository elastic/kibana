/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty, last } from 'lodash';
import React, { Fragment } from 'react';
import { IStackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';
import { EmptyMessage } from '../../shared/EmptyMessage';
import { LibraryStacktrace } from './LibraryStacktrace';
import { Stackframe } from './Stackframe';

interface Props {
  stackframes?: IStackframe[];
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
              <EuiSpacer size="m" />
              <LibraryStacktrace
                id={i.toString()}
                stackframes={group.stackframes}
                codeLanguage={codeLanguage}
              />
              <EuiSpacer size="m" />
            </Fragment>
          );
        }

        // non-library frame
        return group.stackframes.map((stackframe, idx) => (
          <Fragment key={`${i}-${idx}`}>
            {idx > 0 && <EuiSpacer size="m" />}
            <Stackframe
              codeLanguage={codeLanguage}
              id={`${i}-${idx}`}
              initialIsOpen={i === 0 && groups.length > 1}
              stackframe={stackframe}
            />
          </Fragment>
        ));
      })}
      <EuiSpacer size="m" />
    </Fragment>
  );
}

interface StackframesGroup {
  isLibraryFrame: boolean;
  excludeFromGrouping: boolean;
  stackframes: IStackframe[];
}

export function getGroupedStackframes(stackframes: IStackframe[]) {
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
