/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup } from '@elastic/eui';
import { PluginStatement as PluginStatementModel } from '../../models/pipeline/plugin_statement';
import { CollapsibleStatement } from './collapsible_statement';
import { IfElement } from '../../models/list/if_element';
import { PluginStatement } from './plugin_statement';

export class Statement extends React.PureComponent
{
  renderNestingSpacers(depth) {
    const spacers = [];
    for (let i = 0; i < depth; i += 1) {
      spacers.push(<div key={`spacer_${i}`} className="cv-spacer" />);
    }
    return spacers;
  }

  renderStatement(statement) {
    const {
      collapse,
      element,
      element: { id },
      expand,
      isCollapsed,
      onShowVertexDetails
    } = this.props;

    if (statement instanceof PluginStatementModel) {
      return (
        <PluginStatement
          statement={statement}
          onShowVertexDetails={onShowVertexDetails}
        />
      );
    }
    return (
      <CollapsibleStatement
        expand={expand}
        collapse={collapse}
        statement={statement}
        isIf={element instanceof IfElement}
        isCollapsed={isCollapsed}
        id={id}
        onShowVertexDetails={onShowVertexDetails}
      />
    );
  }

  getTopLevelStatementPadding(depth) {
    return depth === 0
      ? { paddingLeft: '0px' }
      : null;
  }

  render() {
    const {
      depth,
      statement
    } = this.props.element;

    const topLevelStatementPadding = this.getTopLevelStatementPadding(depth);
    const spacers = this.renderNestingSpacers(depth);
    const statementComponent = this.renderStatement(statement);

    return (
      <li className="cv-list">
        <div className="cv-spaceContainer">
          {spacers}
        </div>
        <EuiFlexGroup gutterSize="none">
          <div
            className="cv-statement__content"
            style={topLevelStatementPadding}
          >
            {statementComponent}
          </div>
        </EuiFlexGroup>
      </li>
    );
  }
}

Statement.propTypes = {
  collapse: PropTypes.func.isRequired,
  element: PropTypes.shape({
    depth: PropTypes.number.isRequired,
    id: PropTypes.string.isRequired,
    statement: PropTypes.object.isRequired
  }).isRequired,
  expand: PropTypes.func.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onShowVertexDetails: PropTypes.func.isRequired
};
