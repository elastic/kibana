/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * React component for rendering a select element with threshold levels.
 */
import PropTypes from 'prop-types';
import { get } from 'lodash';
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

const warningLabel = i18n.translate('xpack.ml.controls.selectSeverity.warningLabel', { defaultMessage: 'warning' });
const minorLabel = i18n.translate('xpack.ml.controls.selectSeverity.minorLabel', { defaultMessage: 'minor' });
const majorLabel = i18n.translate('xpack.ml.controls.selectSeverity.majorLabel', { defaultMessage: 'major' });
const criticalLabel = i18n.translate('xpack.ml.controls.selectSeverity.criticalLabel', { defaultMessage: 'critical' });

const optionsMap = {
  [warningLabel]: 0,
  [minorLabel]: 25,
  [majorLabel]: 50,
  [criticalLabel]: 75,
};

export const SEVERITY_OPTIONS = [
  {
    val: 0,
    display: warningLabel,
    color: getSeverityColor(0)
  },
  {
    val: 25,
    display: minorLabel,
    color: getSeverityColor(25)
  },
  {
    val: 50,
    display: majorLabel,
    color: getSeverityColor(50)
  },
  {
    val: 75,
    display: criticalLabel,
    color: getSeverityColor(75)
  },
];

function optionValueToThreshold(value) {
  // Get corresponding threshold object with required display and val properties from the specified value.
  let threshold = SEVERITY_OPTIONS.find(opt => (opt.val === value));

  // Default to warning if supplied value doesn't map to one of the options.
  if (threshold === undefined) {
    threshold = SEVERITY_OPTIONS[0];
  }

  return threshold;
}

// This service will be populated by the corresponding angularjs based one.
export const mlSelectSeverityService = {
  intialized: false,
  state: null
};

class SelectSeverity extends Component {
  constructor(props) {
    super(props);

    // Restore the threshold from the state, or default to warning.
    if (mlSelectSeverityService.intialized) {
      this.mlSelectSeverityService = mlSelectSeverityService;
    }

    this.state = {
      valueDisplay: SEVERITY_OPTIONS[0].display,
    };
  }

  componentDidMount() {
    // set initial state from service if available
    if (this.mlSelectSeverityService !== undefined) {
      const thresholdState = this.mlSelectSeverityService.state.get('threshold');
      const thresholdValue = get(thresholdState, 'val', 0);
      const threshold = optionValueToThreshold(thresholdValue);
      // set initial selected option equal to threshold value
      const selectedOption = SEVERITY_OPTIONS.find(opt => (opt.val === threshold.val));
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
    SEVERITY_OPTIONS.map(({ color, display, val }) => ({
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
                id="xpack.ml.controls.selectSeverity.scoreDetailsDescription"
                defaultMessage="score {value} and above"
                values={{ value: val }}
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

export { SelectSeverity };
