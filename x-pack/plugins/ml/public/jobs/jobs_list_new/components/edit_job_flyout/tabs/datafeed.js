/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component
} from 'react';

import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiFieldNumber,
} from '@elastic/eui';

import '../styles/main.less';
import { calculateDatafeedFrequencyDefaultSeconds } from 'plugins/ml/../common/util/job_utils';
import { newJobDefaults } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';
import { parseInterval } from 'plugins/ml/../common/util/parse_interval';
import { MLJobEditor } from '../../ml_job_editor';

export class Datafeed extends Component {
  constructor(props) {
    super(props);

    this.state = {
      query: '',
      queryDelay: '',
      frequency: '',
      scrollSize: '',
      defaults: {
        queryDelay: '',
        frequency: '',
        scrollSize: 0,
      },
      jobDefaults: newJobDefaults()
    };

    this.setDatafeed = props.setDatafeed;
  }

  static getDerivedStateFromProps(props, state) {
    return {
      query: props.datafeedQuery,
      queryDelay: props.datafeedQueryDelay,
      frequency: props.datafeedFrequency,
      scrollSize: props.datafeedScrollSize,
      defaults: getDefaults(props.jobBucketSpan, state.jobDefaults)
    };
  }

  setDefaults() {

  }

  queryChange = (query) => {
    this.setDatafeed({ datafeedQuery: query });
  }

  queryDelayChange = (e) => {
    this.setDatafeed({ datafeedQueryDelay: e.target.value });
  }

  frequencyChange = (e) => {
    this.setDatafeed({ datafeedFrequency: e.target.value });
  }

  scrollSizeChange = (e) => {
    this.setDatafeed({ datafeedScrollSize: +e.target.value });
  }

  render() {
    const {
      query,
      queryDelay,
      frequency,
      scrollSize,
      defaults,
    } = this.state;
    return (
      <React.Fragment>
        <EuiSpacer size="m" />
        <EuiForm>
          <EuiFormRow
            label="Query"
            style={{ maxWidth: 'inherit' }}
          >
            <MLJobEditor
              value={query}
              onChange={this.queryChange}
              height="200px"
            />
          </EuiFormRow>
          <EuiFormRow
            label="Query delay"
          >
            <EuiFieldText
              value={queryDelay}
              placeholder={defaults.queryDelay}
              onChange={this.queryDelayChange}
            />
          </EuiFormRow>
          <EuiFormRow
            label="Frequency"
          >
            <EuiFieldText
              value={frequency}
              placeholder={defaults.frequency}
              onChange={this.frequencyChange}
            />
          </EuiFormRow>
          <EuiFormRow
            label="Scroll size"
          >
            <EuiFieldNumber
              value={scrollSize}
              placeholder={defaults.scrollSize}
              onChange={this.scrollSizeChange}
            />
          </EuiFormRow>

        </EuiForm>
      </React.Fragment>
    );
  }
}
Datafeed.propTypes = {
  datafeedQuery: PropTypes.string.isRequired,
  datafeedQueryDelay: PropTypes.string.isRequired,
  datafeedFrequency: PropTypes.string.isRequired,
  datafeedScrollSize: PropTypes.number.isRequired,
  jobBucketSpan: PropTypes.string.isRequired,
  setDatafeed: PropTypes.func.isRequired,
};

function getDefaults(bucketSpan, jobDefaults) {
  const bucketSpanSeconds = (bucketSpan !== undefined) ? parseInterval(bucketSpan).asSeconds() : '';
  return {
    queryDelay: '60s',
    frequency: calculateDatafeedFrequencyDefaultSeconds(bucketSpanSeconds) + 's',
    scrollSize: jobDefaults.datafeeds.scroll_size,
  };
}
