/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';


export class FeatureTooltip extends React.Component {


  _renderProperties() {
    return Object.keys(this.props.properties).map(propertyName => {
      const content = `<strong>${propertyName}</strong>` + ' ' + this.props.properties[propertyName];
      return (
        // eslint-disable-next-line react/no-danger
        <div key={propertyName} dangerouslySetInnerHTML={{ __html: content }} />
      );
    });
  }

  render() {
    return (
      <Fragment>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={true}>
            <EuiFlexGroup alignItems="flexEnd" direction="row" justifyContent="spaceBetween">
              <EuiFlexItem>&nbsp;</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  onClick={this.props.onCloseClick}
                  iconType="cross"
                  aria-label={i18n.translate('xpack.maps.tooltip.closeAreaLabel', {
                    defaultMessage: 'Close tooltip'
                  })}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            {this._renderProperties()}
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }
}

