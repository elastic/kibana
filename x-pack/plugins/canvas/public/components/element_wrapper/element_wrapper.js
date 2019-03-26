/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Positionable } from '../positionable';
import { ElementContent } from '../element_content';

export class ElementWrapper extends React.PureComponent {
  static propTypes = {
    renderable: PropTypes.object,
    transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    createHandlers: PropTypes.func.isRequired,
    state: PropTypes.string,
    expression: PropTypes.string,
  };

  constructor(props) {
    super(props);
    this._handlers = null;
    this.createHandlers();
  }

  componentDidUpdate(nextProps) {
    if (nextProps.expression !== this.props.expression) {
      this.createHandlers();
    }
  }

  createHandlers() {
    console.log('wrapper createHandlers');
    this._handlers = this.props.createHandlers(this.props.selectedPage);
  }

  render() {
    const { renderable, transformMatrix, width, height, state } = this.props;

    return (
      <Positionable transformMatrix={transformMatrix} width={width} height={height}>
        <ElementContent renderable={renderable} state={state} handlers={this._handlers} />
      </Positionable>
    );
  }
}
