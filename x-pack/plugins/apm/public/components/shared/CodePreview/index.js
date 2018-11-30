/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import styled from 'styled-components';
import {
  units,
  px,
  colors,
  fontFamilyCode,
  borderRadius
} from '../../../style/variables';

import { isEmpty } from 'lodash';

import { registerLanguage } from 'react-syntax-highlighter/dist/light';
import javascript from 'react-syntax-highlighter/dist/languages/javascript';
import python from 'react-syntax-highlighter/dist/languages/python';
import ruby from 'react-syntax-highlighter/dist/languages/ruby';
import { Variables } from './Variables';
import { Context } from './Context';
import { FrameHeading } from '../Stacktrace/FrameHeading';

registerLanguage('javascript', javascript);
registerLanguage('python', python);
registerLanguage('ruby', ruby);

const CodeHeader = styled.div`
  border-bottom: 1px solid ${colors.gray4};
  border-radius: ${borderRadius} ${borderRadius} 0 0;
`;

const Container = styled.div`
  margin: 0 0 ${px(units.plus)} 0;
  position: relative;
  font-family: ${fontFamilyCode};
  border: 1px solid ${colors.gray4};
  border-radius: ${borderRadius};
  background: ${props => (props.isLibraryFrame ? colors.white : colors.gray5)};
`;

class CodePreview extends PureComponent {
  state = {
    variablesVisible: false
  };

  toggleVariables = () =>
    this.setState(() => {
      return { variablesVisible: !this.state.variablesVisible };
    });

  render() {
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

export default CodePreview;
