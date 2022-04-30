/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TooltipSelector } from '../../../components/tooltip_selector';
import { getEmsFileLayers } from '../../../util';
import { IEmsFileSource } from './ems_file_source';
import { IField } from '../../fields/field';
import { OnSourceChangeArgs } from '../source';

interface Props {
  layerId: string;
  onChange: (...args: OnSourceChangeArgs[]) => void;
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
    let fields: IField[] = [];
    try {
      const emsFiles = await getEmsFileLayers();
      const targetEmsFile = emsFiles.find((emsFile) => emsFile.getId() === this.props.layerId);
      if (targetEmsFile) {
        fields = targetEmsFile
          .getFieldsInLanguage()
          .map((field) => this.props.source.createField({ fieldName: field.name }));
      }
    } catch (e) {
      // When a matching EMS-config cannot be found, the source already will have thrown errors during the data request.
      // This will propagate to the vector-layer and be displayed in the UX
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
