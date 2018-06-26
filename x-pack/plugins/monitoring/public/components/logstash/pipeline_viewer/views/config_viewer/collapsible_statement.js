/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';

function renderStatementName(name, onVertexSelected) {
  return (
    <EuiFlexItem
      grow={false}
      key="statementName"
    >
      <EuiButtonEmpty
        color="text"
        size="xs"
        onClick={onVertexSelected}
        flush="left"
      >
        <span className="configViewer__conditional">{name}</span>
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
}

function renderIfStatement({ condition }, onVertexSelected) {
  return [
    renderStatementName('if', onVertexSelected),
    (
      <EuiFlexItem
        key="ifContent"
        grow={false}
      >
        <EuiCodeBlock
          fontSize="s"
          paddingSize="none"
          transparentBackground={true}
        >
          {condition}
        </EuiCodeBlock>
      </EuiFlexItem>
    )
  ];
}

function getStatementBody({
  isIf,
  statement,
  statement: { vertex },
  onShowVertexDetails
}) {
  const showVertexDetailsClicked = () => { onShowVertexDetails(vertex); };

  return isIf
    ? renderIfStatement(statement, showVertexDetailsClicked)
    : renderStatementName('else', showVertexDetailsClicked);
}

function getToggleIconType(isCollapsed) {
  return isCollapsed ? 'arrowRight' : 'arrowDown';
}

export function CollapsibleStatement(props) {
  const {
    collapse,
    expand,
    id,
    isCollapsed
  } = props;

  const toggleClicked = () => {
    if (isCollapsed) {
      expand(id);
    } else {
      collapse(id);
    }
  };

  return (
    <EuiFlexGroup
      responsive={false}
      gutterSize="none"
      alignItems="center"
      className="configViewer__statement"
    >
      <EuiFlexItem
        key={id}
        grow={false}
      >
        <EuiButtonIcon
          aria-label
          color="text"
          iconType={getToggleIconType(isCollapsed)}
          onClick={toggleClicked}
          size="s"
        />
      </EuiFlexItem>
      {getStatementBody(props)}
    </EuiFlexGroup>
  );
}

CollapsibleStatement.propTypes = {
  collapse: PropTypes.func.isRequired,
  expand: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
  isIf: PropTypes.bool.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onShowVertexDetails: PropTypes.func.isRequired,
  statement: PropTypes.object.isRequired,
};
