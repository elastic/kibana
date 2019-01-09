/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import _ from 'lodash';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiLink,
} from '@elastic/eui';


export class AttributionControl  extends React.Component {

  constructor() {
    super();
    this.state = {
      uniqueAttributions: []
    };
  }

  componentDidMount() {
    this._isMouunted = true;
  }

  componentWillUnmount() {
    this._isMouunted = false;
  }

  _syncMbMapWithAttribution = async () => {

    const attributionPromises = this.props.layerList.map(layer => {
      return layer.getAttributions();
    });
    const attributions = await Promise.all(attributionPromises);
    if (!this._isMouunted) {
      return;
    }

    const uniqueAttributions = [];
    for (let i = 0; i < attributions.length; i++) {
      for (let j = 0; j < attributions[i].length; j++) {
        const testAttr = attributions[i][j];
        const attr = uniqueAttributions.find((added) => {
          return (added.url === testAttr.url && added.label === testAttr.label);
        });
        if (!attr) {
          uniqueAttributions.push(testAttr);
        }
      }
    }
    if (!_.isEqual(this.state.uniqueAttributions, uniqueAttributions)) {
      this.setState({
        uniqueAttributions: uniqueAttributions
      });
    }
  };

  _renderAttributions() {
    return this.state.uniqueAttributions.map((attribution, index) => {
      return (
        <Fragment key={index}>
          <EuiLink href={attribution.url} target="_blank">{attribution.label}</EuiLink>
        </Fragment>
      );
    });
  }

  render() {
    this._syncMbMapWithAttribution();
    const attributions = this._renderAttributions();
    return (
      <EuiPanel className="gisWidgetControl" hasShadow paddingSize="s">
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
            {attributions}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
}
