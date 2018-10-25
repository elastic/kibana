/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Fragment, Component } from 'react';

import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
} from '@elastic/eui';


// onChange we change the props passed in as the label and content
export class EnableModelPlotCheckbox extends Component {
  constructor(props) {
    super(props);

    this.state = {
      checked: false,
    };
  }

  tooltipContent = `Select to enable model plot. Stores model information along with the results.
                  Can add considerable overhead to the performance of the system.`;

  onChange = e => {
    this.setState({
      checked: e.target.checked,
    });

    this.props.onCheckboxChange(e.target.checked);
  };

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
            <EuiIconTip
              content={this.tooltipContent}
              size={'s'}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }
}

EnableModelPlotCheckbox.propTypes = {
  checkboxDisabled: PropTypes.bool,
  checkboxText: PropTypes.string.isRequired,
  onCheckboxChange: PropTypes.func.isRequired,
};

EnableModelPlotCheckbox.defaultProps = {
  checkboxDisabled: false,
};
