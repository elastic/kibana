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
      <div className="kbnGlobalNavLink">
        <button className="kbnGlobalNavLink__anchor" onClick={this.props.toggleSpaceSelector}>
          <span className="kbnGlobalNavLink__icon"> {this.props.linkIcon} </span>
          <span className="kbnGlobalNavLink__title"> {this.props.linkTitle} </span>
        </button>
      </div>
    );
  }
}
