/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiComboBoxOptionOption } from '@elastic/eui/src/components/combo_box/types';
import { IFieldType } from '../../../../../src/plugins/data/common/index_patterns/fields';

interface Props {
  onJobChange: (jobId: string) => void;
}

interface State {
  jobId: string;
}

export class AnomalyJobSelector extends Component<Props, State> {
  private async _loadJobs() {}

  componentDidMount(): void {
    this._loadJobs();
  }

  onJobIdSelect = (selectedOptions: Array<EuiComboBoxOptionOption<IFieldType>>) => {
    this.props.onJobChange(selectedOptions[0].value!.name!);
  };

  render() {
    return (
      <EuiFormRow
        label={i18n.translate('xpack.ml.maps.jobIdLabel', {
          defaultMessage: 'JobId',
        })}
        display="columnCompressed"
      >
        <EuiComboBox singleSelection={true} onChange={this.onJobIdSelect} options={[]} />
      </EuiFormRow>
    );
  }
}
