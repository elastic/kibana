/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import './collapsible_statement.scss';

function getToggleIconType(isCollapsed) {
  return isCollapsed ? 'arrowRight' : 'arrowDown';
}

export function CollapsibleStatement(props) {
  const { collapse, expand, id, isCollapsed } = props;

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
      className="monPipelineViewer__collapsibleStatement"
    >
      <EuiFlexItem key={id} grow={false}>
        <EuiButtonIcon
          aria-label="collapse"
          color="text"
          iconType={getToggleIconType(isCollapsed)}
          onClick={toggleClicked}
          size="s"
        />
      </EuiFlexItem>
      {props.children}
    </EuiFlexGroup>
  );
}

CollapsibleStatement.propTypes = {
  collapse: PropTypes.func.isRequired,
  expand: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
};
