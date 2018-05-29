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
        className="cv-ifElseStatement__title"
      >
        <span className="cv-ifElseStatement__name">{name}</span>
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
          className="cv-ifStatement__condition"
        >
          {condition}
        </EuiCodeBlock>
      </EuiFlexItem>
    )
  ];
}

export class CollapsibleStatement extends React.PureComponent {
  constructor(props) {
    super(props);

    this.toggleClicked = this.toggleClicked.bind(this);
    this.getToggleIconType = this.getToggleIconType.bind(this);
  }

  toggleClicked() {
    const {
      collapse,
      expand,
      id,
      isCollapsed
    } = this.props;

    if (isCollapsed) {
      expand(id);
    } else {
      collapse(id);
    }
  }

  getToggleIconType() {
    const { isCollapsed } = this.props;
    return isCollapsed ? 'arrowRight' : 'arrowDown';
  }

  getStatementBody() {
    const {
      isIf,
      statement,
      statement: { vertex },
      onShowVertexDetails
    } = this.props;

    const showVertexDetailsClicked = () => { onShowVertexDetails(vertex); };

    return isIf
      ? renderIfStatement(statement, showVertexDetailsClicked)
      : renderStatementName('else', showVertexDetailsClicked);
  }

  render() {
    const { id } = this.props;
    return (
      <EuiFlexGroup responsive={false} gutterSize="xs">
        <EuiFlexItem
          key={id}
          grow={false}
        >
          <EuiButtonIcon
            aria-label
            className="cv-ifElseStatement__toggle"
            color="text"
            iconType={this.getToggleIconType()}
            onClick={this.toggleClicked}
            size="s"
          />
        </EuiFlexItem>
        {this.getStatementBody()}
      </EuiFlexGroup>
    );
  }
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
