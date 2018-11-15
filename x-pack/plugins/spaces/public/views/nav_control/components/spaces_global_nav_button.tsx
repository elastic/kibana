/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { ButtonProps } from '../types';

export class SpacesGlobalNavButton extends Component<ButtonProps> {
  public render() {
    return (
      <div className="global-nav-link">
        <a className="global-nav-link__anchor" onClick={this.props.toggleSpaceSelector}>
          <div className="global-nav-link__icon"> {this.props.linkIcon} </div>
          <div className="global-nav-link__title"> {this.props.linkTitle} </div>
        </a>
      </div>
    );
  }
}
