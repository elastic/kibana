/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiTitle } from '@elastic/eui';
import { get, isEmpty } from 'lodash';
import React, { PureComponent } from 'react';
import styled from 'styled-components';
import { Stackframe } from '../../../../typings/APMDoc';
import { px, units } from '../../../style/variables';
import { CodePreview } from '../../shared/CodePreview';
import { EmptyMessage } from '../../shared/EmptyMessage';
// @ts-ignore
import { Ellipsis } from '../../shared/Icons';
import { FrameHeading } from './FrameHeading';

export interface StackframeCollapsed extends Stackframe {
  libraryFrame?: boolean;
  stackframes?: Stackframe[];
}

const LibraryFrameToggle = styled.div`
  margin: 0 0 ${px(units.plus)} 0;
  user-select: none;
`;

function getCollapsedLibraryFrames(
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

function hasSourceLines(stackframe: Stackframe) {
  return (
    !isEmpty(stackframe.context) || !isEmpty(get(stackframe, 'line.context'))
  );
}

interface Props {
  stackframes?: StackframeCollapsed[];
  codeLanguage?: string;
}

interface StateLibraryframes {
  [i: number]: boolean;
}

interface State {
  libraryframes: StateLibraryframes;
}

export class Stacktrace extends PureComponent<Props, State> {
  public state = {
    libraryframes: {}
  };

  public componentDidMount() {
    if (!this.props.stackframes) {
      // Don't do anything, if there are no stackframes
      return false;
    }

    const hasAnyAppFrames = this.props.stackframes.some(
      frame => !frame.libraryFrame
    );

    if (!hasAnyAppFrames) {
      // If there are no app frames available, always show the only existing group
      this.setState({ libraryframes: { 0: true } });
    }
  }

  public toggle = (i: number) =>
    this.setState(({ libraryframes }) => {
      return { libraryframes: { ...libraryframes, [i]: !libraryframes[i] } };
    });

  public render() {
    const { stackframes = [], codeLanguage } = this.props;
    const { libraryframes } = this.state as State;

    if (isEmpty(stackframes)) {
      return <EmptyMessage heading="No stacktrace available." hideSubheading />;
    }

    return (
      <div>
        <EuiTitle size="xs">
          <h3>Stack traces</h3>
        </EuiTitle>
        {getCollapsedLibraryFrames(stackframes).map((item, i) => {
          if (!item.libraryFrame) {
            if (hasSourceLines(item)) {
              return (
                <CodePreview
                  key={i}
                  stackframe={item}
                  codeLanguage={codeLanguage}
                />
              );
            }
            return <FrameHeading key={i} stackframe={item} />;
          }

          return (
            <Libraryframes
              key={i}
              visible={libraryframes[i]}
              stackframes={item.stackframes || []}
              codeLanguage={codeLanguage}
              onClick={() => this.toggle(i)}
            />
          );
        })}
      </div>
    );
  }
}

interface LibraryframesProps {
  visible?: boolean;
  stackframes: Stackframe[];
  codeLanguage?: string;
  onClick: () => void;
}

const Libraryframes: React.SFC<LibraryframesProps> = ({
  visible,
  stackframes,
  codeLanguage,
  onClick
}) => {
  return (
    <div>
      <LibraryFrameToggle>
        <EuiLink onClick={onClick}>
          <Ellipsis horizontal={visible} style={{ marginRight: units.half }} />{' '}
          {stackframes.length} library frames
        </EuiLink>
      </LibraryFrameToggle>

      <div>
        {visible &&
          stackframes.map(
            (stackframe, i) =>
              hasSourceLines(stackframe) ? (
                <CodePreview
                  key={i}
                  stackframe={stackframe}
                  isLibraryFrame
                  codeLanguage={codeLanguage}
                />
              ) : (
                <FrameHeading key={i} stackframe={stackframe} isLibraryFrame />
              )
          )}
      </div>
    </div>
  );
};
