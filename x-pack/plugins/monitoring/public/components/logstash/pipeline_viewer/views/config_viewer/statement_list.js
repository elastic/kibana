/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatementListHeading } from './statement_list_heading';
import { Statement } from './statement';

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
  }

  elementIsCollapsed(elementId) {
    return this.state.collapsedIds.has(elementId);
  }

  getStatement(element) {
    const { id, parentId } = element;
    const { onShowVertexDetails } = this.props;

    return this.state.collapsedIds.has(parentId) || this.state.collapsedChildIds.has(parentId)
      ? null
      : (
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

    return (
      <ul className="cv-list-parent">
        {
          elements.map(this.getStatement)
        }
      </ul>
    );
  }
}
