/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  // EuiButtonEmpty,
  // EuiButtonIcon,
  // EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
} from '@elastic/eui';
// import { PluginStatement } from '../../models/pipeline/plugin_statement';
import { Statement } from './statement';

// function getStats() {
//   return (

//   );
// }



// function Statement({ element }) {
//   const {
//     statement,
//     depth,
//     parentId
//   } = element;
//   return (
//     <li>hello! I am a <b>Statement</b>!</li>
//   );
// }

export function StatementSection({ iconType, headingText, elements }) {
  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem
          grow={false}
        >
          <EuiIcon
            type={iconType}
            size="s"
          />
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
        >
          <EuiTitle size="m">
            <h3>{headingText}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <StatementList elements={elements} />
    </div>
  );
}

class StatementList extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      collapsedParentIds: new Set()
    };
    this.collapse = this.collapse.bind(this);
    this.expand = this.expand.bind(this);
    this.getStatement = this.getStatement.bind(this);
  }

  elementIsCollapsed(id, parentId) {
    return this.state.collapsedParentIds.has(id) || this.state.collapsedParentIds.has(parentId);
  }

  expand(elementId) {
    console.log(`expand ${elementId}`);
  }

  // receive collapsed element, add to list
  collapse(elementId) {
    const collapsedParentIds = new Set(this.state.collapsedParentIds);
    const { elements } = this.props;

    collapsedParentIds.add(elementId);

    elements.forEach(element => {
      const { parentId, id } = element;
      if (collapsedParentIds.has(parentId)) {
        collapsedParentIds.add(id);
      }
    });

    this.setState({
      collapsedParentIds
    });
  }

  getStatement(statement) {
    const { parentId } = statement;

    return this.state.collapsedParentIds.has(parentId) ?
      null
      :
      (
        <Statement
          key={statement.id}
          element={statement}
          collapse={this.collapse}
          expand={this.expand}
        />
      );
  }

  render() {
    const { elements } = this.props;

    console.log(this.state.collapsedParentIds);

    return (
      <ul className="cv-list-parent">
        {
          elements.map(this.getStatement)
        }
      </ul>
    );
  }
}

// const StatementList = ({ statements, vertexSelected }) => (
//   statements.map((statement, index) => (
//     <Statement
//       statement={statement}
//       key={statement.id}
//       isTop={true}
//       isEvenChild={index + 1 % 2 === 0}
//       isLast={statements.length === index + 1}
//       vertexSelected={vertexSelected}
//     />
//   ))
// );

const sectionFactory = (headerText, iconType, children, vertexSelected) => (
  {
    headerText,
    iconType,
    children: (
      <StatementList
        statements={children}
        vertexSelected={vertexSelected}
      />
    )
  }
);

export const getStatementListFromPipeline = ({ inputStatements, queue, filterStatements, outputStatements }, vertexSelected) => (
  [
    sectionFactory('Input Statements', 'logstashInput', inputStatements, vertexSelected),
    sectionFactory('Queue', 'logstashQueue', [queue], vertexSelected),
    sectionFactory('Filter Statements', 'logstashFilter', filterStatements, vertexSelected),
    sectionFactory('Output Statements', 'logstashOutput', outputStatements, vertexSelected)
  ]
);
