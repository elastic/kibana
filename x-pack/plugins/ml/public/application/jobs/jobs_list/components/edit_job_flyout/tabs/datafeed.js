/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiFieldNumber,
  EuiCallOut,
} from '@elastic/eui';

import { calculateDatafeedFrequencyDefaultSeconds } from '../../../../../../../common/util/job_utils';
import { getNewJobDefaults } from '../../../../../services/ml_server_info';
import { parseInterval } from '../../../../../../../common/util/parse_interval';
import { MLJobEditor, ML_EDITOR_MODE } from '../../ml_job_editor';
import { FormattedMessage } from '@kbn/i18n/react';

function getDefaults(bucketSpan, jobDefaults) {
  const bucketSpanSeconds = bucketSpan !== undefined ? parseInterval(bucketSpan).asSeconds() : '';
  return {
    queryDelay: '60s',
    frequency: calculateDatafeedFrequencyDefaultSeconds(bucketSpanSeconds) + 's',
    scrollSize: jobDefaults.datafeeds.scroll_size,
  };
}

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
      jobDefaults: getNewJobDefaults(),
    };

    this.setDatafeed = props.setDatafeed;
  }

  static getDerivedStateFromProps(props, state) {
    return {
      query: props.datafeedQuery,
      queryDelay: props.datafeedQueryDelay,
      frequency: props.datafeedFrequency,
      scrollSize: props.datafeedScrollSize,
      defaults: getDefaults(props.jobBucketSpan, state.jobDefaults),
    };
  }

  onQueryChange = (query) => {
    this.setDatafeed({ datafeedQuery: query });
  };

  onQueryDelayChange = (e) => {
    this.setDatafeed({ datafeedQueryDelay: e.target.value });
  };

  onFrequencyChange = (e) => {
    this.setDatafeed({ datafeedFrequency: e.target.value });
  };

  onScrollSizeChange = (e) => {
    this.setDatafeed({ datafeedScrollSize: +e.target.value });
  };

  render() {
    const { query, queryDelay, frequency, scrollSize, defaults } = this.state;
    const { datafeedRunning } = this.props;
    return (
      <React.Fragment>
        <EuiSpacer size="m" />
        {datafeedRunning && (
          <>
            <EuiCallOut color="warning">
              <FormattedMessage
                id="xpack.ml.jobsList.editJobFlyout.datafeed.readOnlyCalloutText"
                defaultMessage="Datafeed settings cannot be edited while the datafeed is running. Please stop the job if you wish to edit these settings."
              />
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        )}
        <EuiForm>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.jobsList.editJobFlyout.datafeed.queryLabel"
                defaultMessage="Query"
              />
            }
            style={{ maxWidth: 'inherit' }}
          >
            <MLJobEditor
              mode={ML_EDITOR_MODE.XJSON}
              value={query}
              onChange={this.onQueryChange}
              height="200px"
              readOnly={datafeedRunning}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.jobsList.editJobFlyout.datafeed.queryDelayLabel"
                defaultMessage="Query delay"
              />
            }
          >
            <EuiFieldText
              value={queryDelay}
              placeholder={defaults.queryDelay}
              onChange={this.onQueryDelayChange}
              disabled={datafeedRunning}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.jobsList.editJobFlyout.datafeed.frequencyLabel"
                defaultMessage="Frequency"
              />
            }
          >
            <EuiFieldText
              value={frequency}
              placeholder={defaults.frequency}
              onChange={this.onFrequencyChange}
              disabled={datafeedRunning}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.jobsList.editJobFlyout.datafeed.scrollSizeLabel"
                defaultMessage="Scroll size"
              />
            }
          >
            <EuiFieldNumber
              value={scrollSize}
              placeholder={defaults.scrollSize}
              onChange={this.onScrollSizeChange}
              disabled={datafeedRunning}
            />
          </EuiFormRow>
        </EuiForm>
      </React.Fragment>
    );
  }
}
Datafeed.propTypes = {
  datafeedRunning: PropTypes.bool.isRequired,
  datafeedQuery: PropTypes.string.isRequired,
  datafeedQueryDelay: PropTypes.string.isRequired,
  datafeedFrequency: PropTypes.string.isRequired,
  datafeedScrollSize: PropTypes.number.isRequired,
  jobBucketSpan: PropTypes.string.isRequired,
  setDatafeed: PropTypes.func.isRequired,
};
