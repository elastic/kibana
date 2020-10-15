/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiButtonEmpty, EuiCodeBlock, EuiFlexItem } from '@elastic/eui';
import { PluginStatement as PluginStatementModel } from '../models/pipeline/plugin_statement';
import { CollapsibleStatement } from './collapsible_statement';
import { IfElement } from '../models/list/if_element';
import { PluginStatement } from './plugin_statement';
import './statement.scss';

function renderStatementName(name, onVertexSelected) {
  return (
    <EuiFlexItem grow={false} key="statementName">
      <EuiButtonEmpty
        aria-label={name}
        color="text"
        size="xs"
        onClick={onVertexSelected}
        flush="left"
      >
        <span className="monPipelineViewer__conditional">{name}</span>
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
}

function renderIfStatement({ condition }, onVertexSelected) {
  return [
    renderStatementName('if', onVertexSelected),
    <EuiFlexItem key="ifContent" grow={false}>
      <EuiCodeBlock fontSize="s" paddingSize="none" transparentBackground={true}>
        {condition}
      </EuiCodeBlock>
    </EuiFlexItem>,
  ];
}

function getStatementBody(isIf, statement, vertex, onShowVertexDetails) {
  const showVertexDetailsClicked = () => {
    onShowVertexDetails(vertex);
  };

  return isIf
    ? renderIfStatement(statement, showVertexDetailsClicked)
    : renderStatementName('else', showVertexDetailsClicked);
}

function renderNestingSpacers(depth) {
  const spacers = [];
  for (let i = 0; i < depth; i += 1) {
    spacers.push(<div key={`spacer_${i}`} className="monPipelineViewer__spacer" />);
  }
  return spacers;
}

function renderStatement({
  collapse,
  element,
  element: {
    id,
    statement,
    statement: { vertex },
  },
  expand,
  isCollapsed,
  onShowVertexDetails,
}) {
  if (statement instanceof PluginStatementModel) {
    return <PluginStatement statement={statement} onShowVertexDetails={onShowVertexDetails} />;
  }

  const statementBody = getStatementBody(
    element instanceof IfElement,
    statement,
    vertex,
    onShowVertexDetails
  );

  return (
    <CollapsibleStatement expand={expand} collapse={collapse} isCollapsed={isCollapsed} id={id}>
      {statementBody}
    </CollapsibleStatement>
  );
}

export function Statement(props) {
  const { depth } = props.element;

  return (
    <li className={`monPipelineViewer__listItem`}>
      <div className="monPipelineViewer__spaceContainer">{renderNestingSpacers(depth)}</div>
      {renderStatement(props)}
    </li>
  );
}

Statement.propTypes = {
  collapse: PropTypes.func.isRequired,
  element: PropTypes.shape({
    depth: PropTypes.number.isRequired,
    id: PropTypes.string.isRequired,
    statement: PropTypes.object.isRequired,
  }).isRequired,
  expand: PropTypes.func.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onShowVertexDetails: PropTypes.func.isRequired,
};
