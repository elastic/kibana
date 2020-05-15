/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { Statement } from './statement';

function getCollapsedChildIds(elements, collapsedIds) {
  const collapsedChildIds = new Set();
  elements.forEach(({ id, parentId }) => {
    if (collapsedIds.has(parentId) || collapsedChildIds.has(parentId)) {
      collapsedChildIds.add(id);
    }
  });
  return collapsedChildIds;
}

export class StatementList extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      collapsedIds: new Set(),
      collapsedChildIds: new Set(),
    };
  }

  expand = elementId => {
    const collapsedIds = new Set(this.state.collapsedIds);
    collapsedIds.delete(elementId);
    this.updateCollapsedElement(collapsedIds);
  };

  collapse = elementId => {
    const collapsedIds = new Set(this.state.collapsedIds);
    collapsedIds.add(elementId);
    this.updateCollapsedElement(collapsedIds);
  };

  updateCollapsedElement = collapsedIds => {
    const { elements } = this.props;
    const collapsedChildIds = getCollapsedChildIds(elements, collapsedIds);

    this.setState({
      collapsedIds,
      collapsedChildIds,
    });
  };

  elementIsCollapsed = elementId => this.state.collapsedIds.has(elementId);

  renderStatement = element => {
    const { id, parentId } = element;
    const { onShowVertexDetails } = this.props;

    return this.state.collapsedIds.has(parentId) ||
      this.state.collapsedChildIds.has(parentId) ? null : (
      <Statement
        key={id}
        element={element}
        collapse={this.collapse}
        expand={this.expand}
        isCollapsed={this.elementIsCollapsed(id)}
        onShowVertexDetails={onShowVertexDetails}
      />
    );
  };

  render() {
    const { elements } = this.props;

    return <ul className="monPipelineViewer__list">{elements.map(this.renderStatement)}</ul>;
  }
}

StatementList.propTypes = {
  elements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      // top-level elements have null parentId
      parentId: PropTypes.string,
    })
  ).isRequired,
  onShowVertexDetails: PropTypes.func.isRequired,
};
