/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import styled from 'styled-components';
import {
  borderRadius,
  colors,
  fontFamilyCode,
  px,
  units
} from '../../../style/variables';

import { isEmpty } from 'lodash';

// TODO add dependency for @types/react-syntax-highlighter
// @ts-ignore
import javascript from 'react-syntax-highlighter/dist/languages/javascript';
// @ts-ignore
import python from 'react-syntax-highlighter/dist/languages/python';
// @ts-ignore
import ruby from 'react-syntax-highlighter/dist/languages/ruby';
// @ts-ignore
import { registerLanguage } from 'react-syntax-highlighter/dist/light';
import { Stackframe } from '../../../../typings/APMDoc';
import { FrameHeading } from '../Stacktrace/FrameHeading';
// @ts-ignore
import { Context } from './Context';
// @ts-ignore
import { Variables } from './Variables';

registerLanguage('javascript', javascript);
registerLanguage('python', python);
registerLanguage('ruby', ruby);

const CodeHeader = styled.div`
  border-bottom: 1px solid ${colors.gray4};
  border-radius: ${borderRadius} ${borderRadius} 0 0;
`;

interface ContainerProps {
  isLibraryFrame?: boolean;
}

const Container = styled.div<ContainerProps>`
  margin: 0 0 ${px(units.plus)} 0;
  position: relative;
  font-family: ${fontFamilyCode};
  border: 1px solid ${colors.gray4};
  border-radius: ${borderRadius};
  background: ${props => (props.isLibraryFrame ? colors.white : colors.gray5)};
`;

interface Props {
  isLibraryFrame?: boolean;
  codeLanguage?: string;
  stackframe: Stackframe;
}

export class CodePreview extends PureComponent<Props> {
  public state = {
    variablesVisible: false
  };

  public toggleVariables = () =>
    this.setState(() => {
      return { variablesVisible: !this.state.variablesVisible };
    });

  public render() {
    const { stackframe, codeLanguage, isLibraryFrame } = this.props;
    const hasVariables = !isEmpty(stackframe.vars);

    return (
      <Container isLibraryFrame={isLibraryFrame}>
        <CodeHeader>
          <FrameHeading
            stackframe={stackframe}
            isLibraryFrame={isLibraryFrame}
          />
        </CodeHeader>

        <Context
          stackframe={stackframe}
          codeLanguage={codeLanguage}
          isLibraryFrame={isLibraryFrame}
        />

        {hasVariables && (
          <Variables
            vars={stackframe.vars}
            visible={this.state.variablesVisible}
            onClick={this.toggleVariables}
          />
        )}
      </Container>
    );
  }
}
