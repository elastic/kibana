/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import { PropTypes } from 'prop-types';

import { Statement } from './statement';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel
} from '@elastic/eui';

const IfChildGroup = ({ heading, condition, children, vertex, vertexSelected }) => (
  <li className="statement">
    <IfPill
      heading={heading}
      condition={condition}
      childStatements={children}
      vertex={vertex}
      vertexSelected={vertexSelected}
    />
  </li>
);

const ElseBlock = ({ isLast, children, vertex, vertexSelected }) => (
  <li className="statement">
    <IfPill
      heading="else"
      childStatements={children}
      vertex={vertex}
      vertexSelected={vertexSelected}
      isLast={isLast}
    />
  </li>
);

export const IfStatement = ({ isLast, statement, vertexSelected }) => (
  [
    <IfChildGroup
      heading="if"
      condition={statement.condition}
      children={statement.trueStatements}
      isLast={isLast}
      hasElse={statement.elseStatements.length > 0}
      key={`if-section_${statement.id}`}
      vertex={statement.vertex}
      vertexSelected={vertexSelected}
    />,
    statement.elseStatements.length > 0
      ? (
        <ElseBlock
          isLast={isLast}
          children={statement.elseStatements}
          key={`else-section_${statement.id}`}
          vertex={statement.vertex}
          vertexSelected={vertexSelected}
        />
      )
      : null
  ]
);

class IfPill extends React.Component {
  constructor() {
    super();
    this.state = {
      isCollapsed: false
    };

    this.toggleVisibility = this.toggleVisibility.bind(this);
  }

  toggleVisibility() {
    const nextState = !this.state.isCollapsed;
    this.setState({
      isCollapsed: nextState
    });
  }

  getChildDisplay() {
    return this.state.isCollapsed
      ? { display: 'none' }
      : { };
  }

  getButtonIconType() {
    return this.state.isCollapsed
      ? 'arrowRight'
      : 'arrowDown';
  }

  render() {
    const {
      childStatements,
      condition,
      heading,
      vertex,
      vertexSelected
    } = this.props;
    const childDisplay = this.getChildDisplay();
    const handler = () => vertexSelected(vertex);

    return (
      <div>
        <EuiPanel
          className="statement__content"
          paddingSize="none"
        >
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem
              grow={false}
            >
              <EuiButtonIcon
                color="text"
                size="s"
                aria-label
                iconType={this.getButtonIconType()}
                onClick={this.toggleVisibility}
              />
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              style={{ padding: "0px", margin: "0px" }}
            >
              <EuiButtonEmpty
                color="text"
                onClick={handler}
                size="xs"
              >
                <strong>{heading}</strong>
              </EuiButtonEmpty>
            </EuiFlexItem>
            {
              condition !== null &&
              <EuiFlexItem grow={false}>
                <EuiCodeBlock
                  fontSize="s"
                  className="ifPill__condition"
                  paddingSize="none"
                >
                  {condition}
                </EuiCodeBlock>
              </EuiFlexItem>
            }
          </EuiFlexGroup>
        </EuiPanel>
        <ul
          className="ifChildren"
          style={childDisplay}
        >
          {
            childStatements.map((statement, index) => (
              <Statement
                isTop={false}
                isLast={childStatements.length === index + 1}
                statement={statement}
                key={statement.id}
                vertexSelected={vertexSelected}
              />
            ))
          }
        </ul>
      </div>
    );
  }
}

IfPill.propTypes = {
  childStatements: PropTypes.array.isRequired,
  condition: PropTypes.string,
  heading: PropTypes.string.isRequired
};
