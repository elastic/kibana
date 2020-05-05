/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { TooltipSelector } from '../../../components/tooltip_selector';
import { getEMSClient } from '../../../meta';
import { EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export class UpdateSourceEditor extends Component {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    tooltipFields: PropTypes.arrayOf(PropTypes.object).isRequired,
    source: PropTypes.object,
  };

  state = {
    fields: null,
  };

  componentDidMount() {
    this._isMounted = true;
    this.loadFields();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async loadFields() {
    let fields;
    try {
      const emsClient = getEMSClient();
      const emsFiles = await emsClient.getFileLayers();
      const emsFile = emsFiles.find(emsFile => emsFile.getId() === this.props.layerId);
      const emsFields = emsFile.getFieldsInLanguage();
      fields = emsFields.map(field => this.props.source.createField({ fieldName: field.name }));
    } catch (e) {
      //swallow this error. when a matching EMS-config cannot be found, the source already will have thrown errors during the data request. This will propagate to the vector-layer and be displayed in the UX
      fields = [];
    }

    if (this._isMounted) {
      this.setState({ fields: fields });
    }
  }

  _onTooltipPropertiesSelect = propertyNames => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
  };

  render() {
    return (
      <Fragment>
        <EuiPanel>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.maps.emsSource.tooltipsTitle"
                defaultMessage="Tooltip fields"
              />
            </h5>
          </EuiTitle>

          <EuiSpacer size="m" />

          <TooltipSelector
            tooltipFields={this.props.tooltipFields}
            onChange={this._onTooltipPropertiesSelect}
            fields={this.state.fields}
          />
        </EuiPanel>

        <EuiSpacer size="s" />
      </Fragment>
    );
  }
}
