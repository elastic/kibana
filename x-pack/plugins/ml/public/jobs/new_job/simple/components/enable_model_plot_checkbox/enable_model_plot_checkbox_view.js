/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import PropTypes from 'prop-types';
import React, { Fragment, Component } from 'react';

import {
  EuiCallOut,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { JsonTooltip } from '../../../../../components/json_tooltip/json_tooltip';

import { FormattedMessage } from '@kbn/i18n/react';

export class EnableModelPlotCheckbox extends Component {
  constructor(props) {
    super(props);

    this.state = {
      checked: false,
    };
  }

  warningTitle = (<FormattedMessage
    id="xpack.ml.newJob.simple.enableModelPlot.proceedWithCautionWarningTitle"
    defaultMessage="Proceed with caution!"
  />);

  onChange = (e) => {
    this.setState({
      checked: e.target.checked,
    });
    this.props.onCheckboxChange(e.target.checked);
  };

  renderWarningCallout = () => (
    <Fragment>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiCallOut
            title={this.warningTitle}
            color="warning"
            iconType="help"
          >
            <p>
              {this.props.warningContent}
            </p>
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );

  render() {
    return (
      <Fragment>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="new_job_enable_model_plot"
              label={this.props.checkboxText}
              onChange={this.onChange}
              disabled={this.props.checkboxDisabled}
              checked={this.state.checked}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <JsonTooltip id={'new_job_enable_model_plot'} position="top" />
          </EuiFlexItem>
        </EuiFlexGroup>
        { this.props.warningStatus && this.renderWarningCallout() }
      </Fragment>
    );
  }
}

EnableModelPlotCheckbox.propTypes = {
  checkboxDisabled: PropTypes.bool,
  checkboxText: PropTypes.string.isRequired,
  onCheckboxChange: PropTypes.func.isRequired,
  warningStatus: PropTypes.bool.isRequired,
  warningContent: PropTypes.string.isRequired,
};

EnableModelPlotCheckbox.defaultProps = {
  checkboxDisabled: false,
};
