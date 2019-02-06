/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * React component for a checkbox element to toggle charts display.
 */
import React, { Component } from 'react';

import {
  EuiCheckbox
} from '@elastic/eui';

import makeId from '@elastic/eui/lib/components/form/form_row/make_id';
import { FormattedMessage } from '@kbn/i18n/react';

// This service will be populated by the corresponding angularjs based one.
export const mlCheckboxShowChartsService = {
  intialized: false,
  state: null
};

class CheckboxShowCharts extends Component {
  constructor(props) {
    super(props);

    // Restore the checked setting from the state.
    this.mlCheckboxShowChartsService = mlCheckboxShowChartsService;
    const showCharts = this.mlCheckboxShowChartsService.state.get('showCharts');

    this.state = {
      checked: showCharts
    };
  }

  onChange = (e) => {
    const showCharts = e.target.checked;
    this.mlCheckboxShowChartsService.state.set('showCharts', showCharts);
    this.mlCheckboxShowChartsService.state.changed();

    this.setState({
      checked: showCharts,
    });
  };

  render() {
    return (
      <EuiCheckbox
        id={makeId()}
        label={<FormattedMessage
          id="xpack.ml.controls.checkboxShowCharts.showChartsCheckboxLabel"
          defaultMessage="Show charts"
        />}
        checked={this.state.checked}
        onChange={this.onChange}
      />
    );
  }
}

export { CheckboxShowCharts };
