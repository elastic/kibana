/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { IStackframe } from 'x-pack/plugins/apm/typings/es_schemas/raw/fields/Stackframe';
import { Ellipsis } from '../../shared/Icons';
import { Stackframe } from './Stackframe';

const LibraryFrameToggle = styled.div`
  user-select: none;
`;

interface Props {
  stackframes: IStackframe[];
  codeLanguage?: string;
  initialVisiblity: boolean;
}

interface State {
  isVisible: boolean;
}

export class LibraryStackFrames extends React.Component<Props, State> {
  public state = {
    isVisible: this.props.initialVisiblity
  };

  public onClick = () => {
    this.setState(({ isVisible }) => ({ isVisible: !isVisible }));
  };

  public render() {
    const { stackframes, codeLanguage } = this.props;
    const { isVisible } = this.state;
    if (stackframes.length === 0) {
      return null;
    }

    return (
      <div>
        <LibraryFrameToggle>
          <EuiLink onClick={this.onClick}>
            <Ellipsis horizontal={isVisible} />{' '}
            {i18n.translate(
              'xpack.apm.stacktraceTab.libraryFramesToogleButtonLabel',
              {
                defaultMessage:
                  '{count, plural, one {# library frame} other {# library frames}}',
                values: { count: stackframes.length }
              }
            )}
          </EuiLink>
        </LibraryFrameToggle>

        <div>
          {isVisible && (
            <Fragment>
              <EuiSpacer size="m" />
              {stackframes.map((stackframe, i) => (
                <Stackframe
                  key={i}
                  isLibraryFrame
                  codeLanguage={codeLanguage}
                  stackframe={stackframe}
                />
              ))}
            </Fragment>
          )}
        </div>
      </div>
    );
  }
}
