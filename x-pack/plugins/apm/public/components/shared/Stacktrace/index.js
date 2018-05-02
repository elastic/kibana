/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import styled from 'styled-components';
import { isEmpty, get } from 'lodash';
import CodePreview from '../../shared/CodePreview';
import { Ellipsis } from '../../shared/Icons';
import { units, px } from '../../../style/variables';
import EmptyMessage from '../../shared/EmptyMessage';
import { EuiLink } from '@elastic/eui';

const LibraryFrameToggle = styled.div`
  margin: 0 0 ${px(units.plus)} 0;
  user-select: none;
`;

const LibraryFrames = styled.div``;

function getCollapsedLibraryFrames(stackframes) {
  return stackframes.reduce((acc, stackframe) => {
    if (!stackframe.libraryFrame) {
      return [...acc, stackframe];
    }

    // current stackframe is library frame
    const prevItem = acc[acc.length - 1];
    if (!get(prevItem, 'libraryFrame')) {
      return [...acc, { libraryFrame: true, stackframes: [stackframe] }];
    }

    return [
      ...acc.slice(0, -1),
      { ...prevItem, stackframes: [...prevItem.stackframes, stackframe] }
    ];
  }, []);
}

class Stacktrace extends PureComponent {
  state = {
    libraryframes: {}
  };

  componentWillMount() {
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

  toggle = i =>
    this.setState(({ libraryframes }) => {
      return { libraryframes: { ...libraryframes, [i]: !libraryframes[i] } };
    });

  render() {
    const { stackframes = [], codeLanguage } = this.props;

    if (isEmpty(stackframes)) {
      return <EmptyMessage heading="No stacktrace available." hideSubheading />;
    }

    return (
      <div>
        {getCollapsedLibraryFrames(stackframes).map((item, i) => {
          if (!item.libraryFrame) {
            return (
              <CodePreview
                key={i}
                stackframe={item}
                codeLanguage={codeLanguage}
              />
            );
          }

          return (
            <Libraryframes
              key={i}
              visible={this.state.libraryframes[i]}
              stackframes={item.stackframes}
              codeLanguage={codeLanguage}
              onClick={() => this.toggle(i)}
            />
          );
        })}
      </div>
    );
  }
}

function Libraryframes({ visible, stackframes, codeLanguage, onClick }) {
  return (
    <div>
      <LibraryFrameToggle>
        <EuiLink onClick={onClick}>
          <Ellipsis horizontal={visible} style={{ marginRight: units.half }} />{' '}
          {stackframes.length} library frames
        </EuiLink>
      </LibraryFrameToggle>

      <LibraryFrames>
        {visible &&
          stackframes.map((stackframe, i) => (
            <CodePreview
              key={i}
              stackframe={stackframe}
              isLibraryFrame
              codeLanguage={codeLanguage}
            />
          ))}
      </LibraryFrames>
    </div>
  );
}

export default Stacktrace;
