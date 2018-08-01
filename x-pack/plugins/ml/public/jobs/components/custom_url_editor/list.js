/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for listing the custom URLs added to a job,
 * with buttons for testing and deleting each custom URL.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiToolTip,
} from '@elastic/eui';

import { toastNotifications } from 'ui/notify';

import { getTestUrl } from 'plugins/ml/jobs/components/custom_url_editor/utils';

import { parseInterval } from 'plugins/ml/../common/util/parse_interval';
import { TIME_RANGE_TYPE } from './constants';


function onLabelChange(e, index, customUrls, setCustomUrls) {
  if (index < customUrls.length) {
    customUrls[index] = {
      ...customUrls[index],
      url_name: e.target.value,
    };
    setCustomUrls(customUrls);
  }
}

function onUrlValueChange(e, index, customUrls, setCustomUrls) {
  if (index < customUrls.length) {
    customUrls[index] = {
      ...customUrls[index],
      url_value: e.target.value,
    };
    setCustomUrls(customUrls);
  }
}

function onTimeRangeChange(e, index, customUrls, setCustomUrls) {
  if (index < customUrls.length) {
    customUrls[index] = {
      ...customUrls[index],
      time_range: e.target.value,
    };
    setCustomUrls(customUrls);
  }
}

function onDeleteButtonClick(index, customUrls, setCustomUrls) {
  if (index < customUrls.length) {
    customUrls.splice(index, 1);
    setCustomUrls(customUrls);
  }
}

function onTestButtonClick(index, customUrls, job) {
  if (index < customUrls.length) {
    getTestUrl(job, customUrls[index])
      .then((testUrl) => {
        window.open(testUrl, '_blank');
      })
      .catch((resp) => {
        console.log('onTestButtonClick() - error obtaining URL for test:', resp);
        toastNotifications.addDanger('An error occurred obtaining the URL to test the configuration');
      });
  }
}

function isValidTimeRange(timeRange) {
  // Allow empty timeRange string, which gives the 'auto' behaviour.
  if ((timeRange === undefined) || (timeRange.length === 0) || (timeRange === TIME_RANGE_TYPE.AUTO)) {
    return true;
  }

  const interval = parseInterval(timeRange);
  return (interval !== null);
}

export function CustomUrlList({
  job,
  customUrls,
  setCustomUrls }) {

  // TODO - swap URL input to a textarea on focus / blur.
  const customUrlRows = customUrls.map((customUrl, index) => {

    // Validate the time range.
    const timeRange = customUrl.time_range;
    const isInvalidTimeRange = !(isValidTimeRange(timeRange));
    const invalidIntervalError = (isInvalidTimeRange === true) ? ['Invalid format'] : [];

    return (
      <EuiFlexGroup key={`url_${index}`}>
        <EuiFlexItem grow={false}>
          <EuiFormRow label="Label">
            <EuiFieldText
              value={customUrl.url_name}
              onChange={(e) => onLabelChange(e, index, customUrls, setCustomUrls)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="URL">
            <EuiFieldText
              value={customUrl.url_value}
              onChange={(e) => onUrlValueChange(e, index, customUrls, setCustomUrls)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label="Time range"
            error={invalidIntervalError}
            isInvalid={isInvalidTimeRange}
          >
            <EuiFieldText
              value={customUrl.time_range}
              isInvalid={isInvalidTimeRange}
              placeholder={TIME_RANGE_TYPE.AUTO}
              onChange={(e) => onTimeRangeChange(e, index, customUrls, setCustomUrls)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiToolTip
              content="Test custom URL"
            >
              <EuiButtonIcon
                size="s"
                color="primary"
                onClick={() => onTestButtonClick(index, customUrls, job)}
                iconType="popout"
                aria-label="Test custom URL"
              />
            </EuiToolTip>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiToolTip
              content="Delete custom URL"
            >
              <EuiButtonIcon
                size="s"
                color="danger"
                onClick={() => onDeleteButtonClick(index, customUrls, setCustomUrls)}
                iconType="trash"
                aria-label="Delete custom URL"
              />
            </EuiToolTip>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  });

  return (
    <React.Fragment>
      {customUrlRows}
    </React.Fragment>
  );

}
CustomUrlList.propTypes = {
  job: PropTypes.object.isRequired,
  customUrls: PropTypes.array.isRequired,
  setCustomUrls: PropTypes.func.isRequired,
};

