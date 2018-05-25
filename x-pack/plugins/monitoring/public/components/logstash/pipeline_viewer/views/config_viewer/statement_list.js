/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { StatementListHeading } from './statement_list_heading';
import { Statement } from './statement';

export function StatementSection({
  iconType,
  headingText,
  elements,
  onShowVertexDetails
}) {
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

function getCollapsedChildElements(elements, collapsedIds) {
  const collapsedChildIds = new Set();
  elements.forEach(({ id, parentId }) => {
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

    this.collapse = this.collapse.bind(this);
    this.expand = this.expand.bind(this);
    this.renderStatement = this.renderStatement.bind(this);
    this.elementIsCollapsed = this.elementIsCollapsed.bind(this);
  }

  expand(elementId) {
    const collapsedIds = new Set(this.state.collapsedIds);
    collapsedIds.delete(elementId);
    this.updateCollapsedElements(collapsedIds);
  }

  collapse(elementId) {
    const collapsedIds = new Set(this.state.collapsedIds);
    collapsedIds.add(elementId);
    this.updateCollapsedElements(collapsedIds);
  }

  updateCollapsedElements(collapsedIds) {
    const collapsedChildIds = getCollapsedChildElements(this.props.elements, collapsedIds);

    this.setState({
      collapsedIds,
      collapsedChildIds
    });
  }

  elementIsCollapsed(elementId) {
    return this.state.collapsedIds.has(elementId);
  }

  renderStatement(element) {
    const { id, parentId } = element;
    const { onShowVertexDetails } = this.props;

    return this.state.collapsedIds.has(parentId) || this.state.collapsedChildIds.has(parentId)
      ? null
      : (
        <Statement
          key={id}
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
      <ul className="cv-listParent">
        {
          elements.map(this.renderStatement)
        }
      </ul>
    );
  }
}

StatementList.propTypes = {
  elements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      // top-level elements have null parentId
      parentId: PropTypes.string
    })
  ).isRequired,
  onShowVertexDetails: PropTypes.func.isRequired,
};
