/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * React component for rendering a select element with threshold levels.
 */
import PropTypes from 'prop-types';
import _ from 'lodash';
import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiHealth,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';

import { getSeverityColor } from '../../../../common/util/anomaly_utils';


const optionsMap = {
  'warning': 0,
  'minor': 25,
  'major': 50,
  'critical': 75,
};

const getSeverityOptions = () => {
  const warning = i18n.translate('xpack.ml.controls.selectSeverity.warning', {
    defaultMessage: 'warning',
  });
  const minor = i18n.translate('xpack.ml.controls.selectSeverity.minor', {
    defaultMessage: 'minor',
  });
  const major = i18n.translate('xpack.ml.controls.selectSeverity.major', {
    defaultMessage: 'major',
  });
  const critical = i18n.translate('xpack.ml.controls.selectSeverity.critical', {
    defaultMessage: 'critical',
  });
  return [
    { val: 0, display: warning, color: getSeverityColor(0) },
    { val: 25, display: minor, color: getSeverityColor(25) },
    { val: 50, display: major, color: getSeverityColor(50) },
    { val: 75, display: critical, color: getSeverityColor(75) },
  ];
};

function optionValueToThreshold(value) {
  // Get corresponding threshold object with required display and val properties from the specified value.
  let threshold = getSeverityOptions().find(opt => (opt.val === value));

  // Default to warning if supplied value doesn't map to one of the options.
  if (threshold === undefined) {
    threshold = getSeverityOptions()[0];
  }

  return threshold;
}

class SelectSeverity extends Component {
  constructor(props) {
    super(props);

    // Restore the threshold from the state, or default to warning.
    if (this.props.mlSelectSeverityService) {
      this.mlSelectSeverityService = this.props.mlSelectSeverityService;
    }

    this.state = {
      valueDisplay: getSeverityOptions()[0].display,
    };
  }

  componentDidMount() {
    // set initial state from service if available
    if (this.mlSelectSeverityService !== undefined) {
      const thresholdState = this.mlSelectSeverityService.state.get('threshold');
      const thresholdValue = _.get(thresholdState, 'val', 0);
      const threshold = optionValueToThreshold(thresholdValue);
      // set initial selected option equal to threshold value
      const selectedOption = getSeverityOptions().find(opt => (opt.val === threshold.val));
      this.mlSelectSeverityService.state.set('threshold', threshold);
      this.setState({ valueDisplay: selectedOption.display, });
    }
  }

  onChange = (valueDisplay) => {
    this.setState({
      valueDisplay: valueDisplay,
    });
    const threshold = optionValueToThreshold(optionsMap[valueDisplay]);

    if (this.mlSelectSeverityService !== undefined) {
      this.mlSelectSeverityService.state.set('threshold', threshold).changed();
    } else {
      this.props.onChangeHandler(threshold);
    }
  }

  getOptions = () =>
    getSeverityOptions().map(({ color, display, val }) => ({
      value: display,
      inputDisplay: (
        <Fragment>
          <EuiHealth color={color} style={{ lineHeight: 'inherit' }}>
            {display}
          </EuiHealth>
        </Fragment>
      ),
      dropdownDisplay: (
        <Fragment>
          <EuiHealth color={color} style={{ lineHeight: 'inherit' }}>
            {display}
          </EuiHealth>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p className="euiTextColor--subdued">
              <FormattedMessage
                id="xpack.ml.controls.selectSeverity.scoreDetailsDropDownDescription"
                defaultMessage="score {score} and above"
                values={{ score: val }}
              />
            </p>
          </EuiText>
        </Fragment>
      ),
    }));

  render() {
    const { valueDisplay } = this.state;
    const options = this.getOptions();

    return (
      <EuiSuperSelect
        className={this.props.classNames}
        hasDividers
        options={options}
        valueOfSelected={valueDisplay}
        onChange={this.onChange}
      />
    );
  }
}

SelectSeverity.propTypes = {
  mlSelectSeverityService: PropTypes.object,
  onChangeHandler: PropTypes.func,
  classNames: PropTypes.string
};

SelectSeverity.defaultProps = {
  mlSelectSeverityService: undefined,
  onChangeHandler: () => {},
  classNames: ''
};

export { SelectSeverity, getSeverityOptions };
