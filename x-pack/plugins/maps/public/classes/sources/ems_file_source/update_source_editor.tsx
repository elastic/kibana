/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { TooltipSelector } from '../../../components/tooltip_selector';
// @ts-ignore
import { getEMSClient } from '../../../meta';
import { IEmsFileSource } from './ems_file_source';
import { IField } from '../../fields/field';
import { OnSourceChangeArgs } from '../../../connected_components/layer_panel/view';

interface Props {
  layerId: string;
  onChange: (args: OnSourceChangeArgs) => void;
  source: IEmsFileSource;
  tooltipFields: IField[];
}

interface State {
  fields: IField[] | null;
}

export class UpdateSourceEditor extends Component<Props, State> {
  private _isMounted: boolean = false;

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
      // @ts-ignore
      const emsClient = getEMSClient();
      // @ts-ignore
      const emsFiles = await emsClient.getFileLayers();
      // @ts-ignore
      const taregetEmsFile = emsFiles.find(emsFile => emsFile.getId() === this.props.layerId);
      // @ts-ignore
      const emsFields = taregetEmsFile.getFieldsInLanguage();
      // @ts-ignore
      fields = emsFields.map(field => this.props.source.createField({ fieldName: field.name }));
    } catch (e) {
      // When a matching EMS-config cannot be found, the source already will have thrown errors during the data request.
      // This will propagate to the vector-layer and be displayed in the UX
      fields = [];
    }

    if (this._isMounted) {
      this.setState({ fields });
    }
  }

  _onTooltipPropertiesSelect = (selectedFieldNames: string[]) => {
    this.props.onChange({ propName: 'tooltipProperties', value: selectedFieldNames });
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
