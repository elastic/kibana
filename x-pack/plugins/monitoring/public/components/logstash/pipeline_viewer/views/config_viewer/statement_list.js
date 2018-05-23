/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StatementListHeading } from './statement_list_heading';

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

export function StatementSection({ iconType, headingText, elements, onShowVertexDetails }) {
  return (
    <div className="cv-statementList">
      <StatementListHeading
        iconType={iconType}
        title={headingText}
      />
      <StatementList
        elements={elements}
        onShowVertexDetails={onShowVertexDetails}
      />
    </div>
  );
}

class StatementList extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      collapsedIds: new Set(),
      collapsedChildIds: new Set()
    };
    this.collapse = this.collapse.bind(this);
    this.expand = this.expand.bind(this);
    this.getStatement = this.getStatement.bind(this);
    this.elementIsCollapsed = this.elementIsCollapsed.bind(this);
  }

  expand(elementId) {
    const collapsedIds = new Set(this.state.collapsedIds);
    const collapsedChildIds = new Set();

    collapsedIds.delete(elementId);

    this.props.elements.forEach(element => {
      const { id, parentId } = element;

      if (collapsedIds.has(parentId) || collapsedChildIds.has(parentId)) {
        collapsedChildIds.add(id);
      }
    });

    this.setState({
      collapsedIds,
      collapsedChildIds
    });
    console.log(collapsedIds);
    console.log(collapsedChildIds);
  }

  collapse(elementId) {
    const collapsedIds = new Set(this.state.collapsedIds);
    const collapsedChildIds = new Set(this.state.collapsedChildIds);
    collapsedIds.add(elementId);

    this.props.elements.forEach(element => {
      const { id, parentId } = element;

      if (collapsedIds.has(parentId) || collapsedChildIds.has(parentId)) {
        collapsedChildIds.add(id);
      }
    });

    this.setState({
      collapsedIds,
      collapsedChildIds
    });
    console.log(collapsedIds);
    console.log(collapsedChildIds);
  }

  // expand(elementId) {
  //   const collapsedParentIds = new Set(this.state.collapsedParentIds);
  //   const expandParentIds = [elementId];
  //   const { elements } = this.props;

  //   elements.forEach(element => {
  //     const { id, parentId } = element;
  //     if (expandParentIds.some(expandId => expandId === parentId || expandId === id)) {
  //       expandParentIds.push(id);
  //       collapsedParentIds.delete(id);
  //     }
  //   });
  //   console.log(collapsedParentIds);

  //   this.setState({ collapsedParentIds });
  // }

  // collapse(elementId) {
  //   const collapsedParentIds = new Set(this.state.collapsedParentIds);
  //   const { elements } = this.props;

  //   collapsedParentIds.add(elementId);

  //   elements.forEach(element => {
  //     const { parentId, id } = element;
  //     if (collapsedParentIds.has(parentId)) {
  //       collapsedParentIds.add(id);
  //     }
  //   });

  //   console.log(collapsedParentIds.entries());
  //   this.setState({ collapsedParentIds });
  // }

  elementIsCollapsed(elementId) {
    return this.state.collapsedIds.has(elementId);
  }

  getStatement(element) {
    const { id, parentId } = element;
    const { onShowVertexDetails } = this.props;

    return this.state.collapsedIds.has(parentId) || this.state.collapsedChildIds.has(parentId) ?
      null
      :
      (
        <Statement
          key={element.id}
          element={element}
          collapse={this.collapse}
          expand={this.expand}
          isCollapsed={this.elementIsCollapsed(id)}
          onShowVertexDetails={onShowVertexDetails}
        />
      );
  }

  render() {
    const { elements } = this.props;

    console.log(elements);

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
