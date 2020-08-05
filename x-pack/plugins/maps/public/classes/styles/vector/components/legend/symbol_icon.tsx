/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
// @ts-expect-error
import { getMakiSymbolSvg, styleSvg, buildSrcUrl } from '../../symbol_utils';

interface Props {
  symbolId: string;
  fill?: string;
  stroke?: string;
}

interface State {
  imgDataUrl: string | null;
}

export class SymbolIcon extends Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = {
    imgDataUrl: null,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadSymbol();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadSymbol() {
    let imgDataUrl;
    try {
      const svg = getMakiSymbolSvg(this.props.symbolId);
      const styledSvg = await styleSvg(svg, this.props.fill, this.props.stroke);
      imgDataUrl = buildSrcUrl(styledSvg);
    } catch (error) {
      // ignore failures - component will just not display an icon
      return;
    }

    if (this._isMounted) {
      this.setState({ imgDataUrl });
    }
  }

  render() {
    if (!this.state.imgDataUrl) {
      return null;
    }

    const { symbolId, fill, stroke, ...rest } = this.props;

    return (
      <img
        width="16px"
        height="18px"
        src={this.state.imgDataUrl}
        alt={this.props.symbolId}
        {...rest}
      />
    );
  }
}
