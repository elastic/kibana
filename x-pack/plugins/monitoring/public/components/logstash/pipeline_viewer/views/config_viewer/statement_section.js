/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { StatementListHeading } from './statement_list_heading';
import { Statement } from './statement';
import { EuiSpacer } from '@elastic/eui';

export function StatementSection({
  iconType,
  headingText,
  elements,
  onShowVertexDetails
}) {
  if (!elements.length) { return null; }

  return (
    <div className="configStatementList">
      <StatementListHeading
        iconType={iconType}
        title={headingText}
      />
      <EuiSpacer size="s" />
      <StatementList
        elements={elements}
        onShowVertexDetails={onShowVertexDetails}
      />
    </div>
  );
}

function getCollapsedChildIds(statements, collapsedIds) {
  const collapsedChildIds = new Set();
  statements.forEach(({ id, parentId }) => {
    if (collapsedIds.has(parentId) || collapsedChildIds.has(parentId)) {
      collapsedChildIds.add(id);
    }
  });
  return collapsedChildIds;
}

class StatementList extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      collapsedIds: new Set(),
      collapsedChildIds: new Set()
    };
  }

  expand = statementId => {
    const collapsedIds = new Set(this.state.collapsedIds);
    collapsedIds.delete(statementId);
    this.updateCollapsedStatements(collapsedIds);
  }

  collapse = statementId => {
    const collapsedIds = new Set(this.state.collapsedIds);
    collapsedIds.add(statementId);
    this.updateCollapsedStatements(collapsedIds);
  }

  updateCollapsedStatements = collapsedIds => {
    const { statements } = this.props;
    const collapsedChildIds = getCollapsedChildIds(statements, collapsedIds);

    this.setState({
      collapsedIds,
      collapsedChildIds
    });
  }

  statementIsCollapsed = statementId => this.state.collapsedIds.has(statementId);

  renderStatement = statement => {
    const { id, parentId } = statement;
    const { onShowVertexDetails } = this.props;

    return this.state.collapsedIds.has(parentId) || this.state.collapsedChildIds.has(parentId)
      ? null
      : (
        <Statement
          key={id}
          element={statement}
          collapse={this.collapse}
          expand={this.expand}
          isCollapsed={this.statementIsCollapsed(id)}
          onShowVertexDetails={onShowVertexDetails}
        />
      );
  }

  render() {
    const { statements } = this.props;

    return (
      <ul className="configViewer__list">
        {
          statements.map(this.renderStatement)
        }
      </ul>
    );
  }
}

StatementList.propTypes = {
  statements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      // top-level statements have null parentId
      parentId: PropTypes.string
    })
  ).isRequired,
  onShowVertexDetails: PropTypes.func.isRequired,
};
