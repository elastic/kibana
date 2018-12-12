/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React, { PureComponent } from 'react';
import { Stackframe } from '../../../../typings/es_schemas/APMDoc';
import { CodePreview } from '../../shared/CodePreview';
import { EmptyMessage } from '../../shared/EmptyMessage';
// @ts-ignore
import { Ellipsis } from '../../shared/Icons';
import { FrameHeading } from './FrameHeading';
import { LibraryStackFrames } from './LibraryStackFrames';
import { getGroupedStackframes, hasSourceLines } from './stacktraceUtils';

interface Props {
  stackframes?: Stackframe[];
  codeLanguage?: string;
}

interface State {
  visibilityMap: {
    [i: number]: boolean;
  };
}

export class Stacktrace extends PureComponent<Props, State> {
  public state = {
    visibilityMap: {}
  };

  public componentDidMount() {
    if (!this.props.stackframes) {
      // Don't do anything, if there are no stackframes
      return false;
    }

    const hasAnyAppFrames = this.props.stackframes.some(
      frame => !frame.library_frame
    );

    if (!hasAnyAppFrames) {
      // If there are no app frames available, always show the only existing group
      this.setState({ visibilityMap: { 0: true } });
    }
  }

  public toggle = (i: number) =>
    this.setState(({ visibilityMap }) => {
      return { visibilityMap: { ...visibilityMap, [i]: !visibilityMap[i] } };
    });

  public render() {
    const { stackframes = [], codeLanguage } = this.props;
    const { visibilityMap } = this.state as State;

    if (isEmpty(stackframes)) {
      return <EmptyMessage heading="No stacktrace available." hideSubheading />;
    }

    return (
      <div>
        <EuiTitle size="xs">
          <h3>Stack traces</h3>
        </EuiTitle>
        {getGroupedStackframes(stackframes).map(
          ({ isLibraryFrame, stackframes: groupedStackframes }, i) => {
            if (isLibraryFrame) {
              return (
                <LibraryStackFrames
                  key={i}
                  visible={visibilityMap[i]}
                  stackframes={groupedStackframes}
                  codeLanguage={codeLanguage}
                  onClick={() => this.toggle(i)}
                />
              );
            }
            return groupedStackframes.map((stackframe, idx) =>
              hasSourceLines(stackframe) ? (
                <CodePreview
                  key={idx}
                  stackframe={stackframe}
                  codeLanguage={codeLanguage}
                />
              ) : (
                <FrameHeading key={idx} stackframe={stackframe} />
              )
            );
          }
        )}
      </div>
    );
  }
}
