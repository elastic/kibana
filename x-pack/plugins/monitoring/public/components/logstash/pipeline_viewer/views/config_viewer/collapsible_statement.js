/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexItem,
  EuiFlexGroup
} from '@elastic/eui';

function clickableStatementName(name) {
  return (
    <EuiFlexItem
      grow={false}
    >
      <EuiButtonEmpty
        color="text"
        size="xs"
      >
        <span className="cv-ifStatement__title">{name}</span>
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
}

function ifStatement(statement) {
  const { condition } = statement;
  return [
    clickableStatementName('if'),
    (
      <EuiFlexItem grow={false}>
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

    this.state = {
      isCollapsed: false
    };

    this.toggleClicked = this.toggleClicked.bind(this);
    this.getToggleIconType = this.getToggleIconType.bind(this);
  }

  toggleClicked() {
    const { id } = this.props;

    const {
      collapse,
      expand
    } = this.props;

    this.setState({
      isCollapsed: !this.state.isCollapsed
    });

    if (this.state.isCollapsed) {
      expand(id);
    } else {
      collapse(id);
    }
  }

  getToggleIconType() {
    return this.state.isCollapsed ? 'arrowRight' : 'arrowDown';
  }

  getStatementBody() {
    const {
      isIf,
      statement
    } = this.props;

    return isIf ?
      ifStatement(statement)
      : clickableStatementName('else');
  }

  render() {
    return (
      <EuiFlexGroup
        gutterSize="xs"
      >
        <EuiFlexItem
          grow={false}
        >
          <EuiButtonIcon
            color="text"
            size="s"
            aria-label
            iconType={this.getToggleIconType()}
            onClick={this.toggleClicked}
          />
        </EuiFlexItem>
        {this.getStatementBody()}
      </EuiFlexGroup>
    );
  }
}
