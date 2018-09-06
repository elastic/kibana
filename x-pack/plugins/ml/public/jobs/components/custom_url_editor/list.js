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
import React, {
  Component
} from 'react';

import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiToolTip,
} from '@elastic/eui';

import { toastNotifications } from 'ui/notify';

import { isValidLabel } from '../../../util/custom_url_utils';
import { getTestUrl } from '../../../jobs/components/custom_url_editor/utils';

import { parseInterval } from '../../../../common/util/parse_interval';
import { TIME_RANGE_TYPE } from './constants';


function isValidTimeRange(timeRange) {
  // Allow empty timeRange string, which gives the 'auto' behaviour.
  if ((timeRange === undefined) || (timeRange.length === 0) || (timeRange === TIME_RANGE_TYPE.AUTO)) {
    return true;
  }

  const interval = parseInterval(timeRange);
  return (interval !== null);
}

export class CustomUrlList extends Component {

  constructor(props) {
    super(props);
  }

  onLabelChange = (e, index) => {
    const { customUrls, setCustomUrls } = this.props;
    if (index < customUrls.length) {
      customUrls[index] = {
        ...customUrls[index],
        url_name: e.target.value,
      };
      setCustomUrls(customUrls);
    }
  };

  onUrlValueChange = (e, index) => {
    const { customUrls, setCustomUrls } = this.props;
    if (index < customUrls.length) {
      customUrls[index] = {
        ...customUrls[index],
        url_value: e.target.value,
      };
      setCustomUrls(customUrls);
    }
  };

  onTimeRangeChange = (e, index) => {
    const { customUrls, setCustomUrls } = this.props;
    if (index < customUrls.length) {
      customUrls[index] = {
        ...customUrls[index],
      };

      const timeRange = e.target.value;
      if (timeRange !== undefined && timeRange.length > 0) {
        customUrls[index].time_range = timeRange;
      } else {
        delete customUrls[index].time_range;
      }
      setCustomUrls(customUrls);
    }
  };

  onDeleteButtonClick = (index) => {
    const { customUrls, setCustomUrls } = this.props;
    if (index < customUrls.length) {
      customUrls.splice(index, 1);
      setCustomUrls(customUrls);
    }
  };

  onTestButtonClick = (index) => {
    const { customUrls, job } = this.props;
    if (index < customUrls.length) {
      getTestUrl(job, customUrls[index])
        .then((testUrl) => {
          window.open(testUrl, '_blank');
        })
        .catch((resp) => {
          console.log('Error obtaining URL for test:', resp);
          toastNotifications.addDanger('An error occurred obtaining the URL to test the configuration');
        });
    }
  };

  render() {
    const customUrls = this.props.customUrls;

    // TODO - swap URL input to a textarea on focus / blur.
    const customUrlRows = customUrls.map((customUrl, index) => {

      // Validate the label.
      const label = customUrl.url_name;
      const otherUrls = [...customUrls];
      otherUrls.splice(index, 1);   // Don't compare label with itself.
      const isInvalidLabel = !isValidLabel(label, otherUrls);
      const invalidLabelError = (isInvalidLabel === true) ? ['A unique label must be supplied'] : [];

      // Validate the time range.
      const timeRange = customUrl.time_range;
      const isInvalidTimeRange = !(isValidTimeRange(timeRange));
      const invalidIntervalError = (isInvalidTimeRange === true) ? ['Invalid format'] : [];

      return (
        <EuiFlexGroup key={`url_${index}`}>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label="Label"
              isInvalid={isInvalidLabel}
              error={invalidLabelError}
            >
              <EuiFieldText
                value={label}
                isInvalid={isInvalidLabel}
                onChange={(e) => this.onLabelChange(e, index)}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="URL">
              <EuiFieldText
                value={customUrl.url_value}
                onChange={(e) => this.onUrlValueChange(e, index)}
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
                value={customUrl.time_range || ''}
                isInvalid={isInvalidTimeRange}
                placeholder={TIME_RANGE_TYPE.AUTO}
                onChange={(e) => this.onTimeRangeChange(e, index)}
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
                  onClick={() => this.onTestButtonClick(index)}
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
                  onClick={() => this.onDeleteButtonClick(index)}
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

}
CustomUrlList.propTypes = {
  job: PropTypes.object.isRequired,
  customUrls: PropTypes.array.isRequired,
  setCustomUrls: PropTypes.func.isRequired,
};

