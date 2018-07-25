/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for the form for editing a custom URL.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';

import {
  isValidCustomUrlLabel,
  isValidCustomUrlSettingsTimeRange
} from 'plugins/ml/jobs/components/custom_url_editor/utils';

import './styles/main.less';

import {
  TIME_RANGE_TYPE,
  URL_TYPE
} from './constants';

function getLinkToOptions() {
  return [{
    id: URL_TYPE.KIBANA_DASHBOARD,
    label: 'Kibana dashboard',
  }, {
    id: URL_TYPE.KIBANA_DISCOVER,
    label: 'Discover',
  }, {
    id: URL_TYPE.OTHER,
    label: 'Other',
  }];
}

function onLabelChange(e, customUrl, setEditCustomUrl) {
  setEditCustomUrl({
    ...customUrl,
    label: e.target.value
  });
}

function onTypeChange(linkType, customUrl, setEditCustomUrl) {
  setEditCustomUrl({
    ...customUrl,
    type: linkType
  });
}

function onDashboardChange(e, customUrl, setEditCustomUrl) {
  const kibanaSettings = customUrl.kibanaSettings;
  setEditCustomUrl({
    ...customUrl,
    kibanaSettings: {
      ...kibanaSettings,
      dashboardId: e.target.value
    }
  });
}
function onDiscoverIndexPatternChange(e, customUrl, setEditCustomUrl) {
  const kibanaSettings = customUrl.kibanaSettings;
  setEditCustomUrl({
    ...customUrl,
    kibanaSettings: {
      ...kibanaSettings,
      discoverIndexPatternId: e.target.value
    }
  });
}

function onQueryEntitiesChange(selectedOptions, customUrl, setEditCustomUrl) {
  const selectedFieldNames = selectedOptions.map(option => option.label);

  const kibanaSettings = customUrl.kibanaSettings;
  setEditCustomUrl({
    ...customUrl,
    kibanaSettings: {
      ...kibanaSettings,
      queryFieldNames: selectedFieldNames
    }
  });
}

function onOtherUrlValueChange(e, customUrl, setEditCustomUrl) {
  setEditCustomUrl({
    ...customUrl,
    otherUrlSettings: {
      urlValue: e.target.value
    }
  });
}

function onTimeRangeTypeChange(e, customUrl, setEditCustomUrl) {
  const timeRange = customUrl.timeRange;
  setEditCustomUrl({
    ...customUrl,
    timeRange: {
      ...timeRange,
      type: e.target.value
    }
  });
}

function onTimeRangeIntervalChange(e, customUrl, setEditCustomUrl) {
  const timeRange = customUrl.timeRange;
  setEditCustomUrl({
    ...customUrl,
    timeRange: {
      ...timeRange,
      interval: e.target.value
    }
  });
}


export function CustomUrlEditor({
  customUrl,
  setEditCustomUrl,
  dashboards,
  indexPatterns,
  queryEntityFieldNames }) {

  if (customUrl === undefined) {
    return;
  }

  const {
    label,
    type,
    timeRange,
    kibanaSettings,
    otherUrlSettings
  } = customUrl;

  const dashboardOptions = dashboards.map((dashboard) => {
    return { value: dashboard.id, text: dashboard.title };
  });

  const indexPatternOptions = indexPatterns.map((indexPattern) => {
    return { value: indexPattern.id, text: indexPattern.title };
  });

  const entityOptions = queryEntityFieldNames.map(fieldName => ({ label: fieldName }));
  const queryFieldNames = kibanaSettings.queryFieldNames;
  let selectedEntityOptions = [];
  if (queryFieldNames !== undefined) {
    selectedEntityOptions = queryFieldNames.map(fieldName => ({ label: fieldName }));
  }

  const timeRangeOptions = Object.keys(TIME_RANGE_TYPE).map((timeRangeType) => {
    return { value: TIME_RANGE_TYPE[timeRangeType], text: TIME_RANGE_TYPE[timeRangeType] };
  });


  const isInvalidTimeRange = !isValidCustomUrlSettingsTimeRange(timeRange);
  const invalidIntervalError = (isInvalidTimeRange === true) ?
    ['Invalid interval format'] : [];

  return (
    <React.Fragment>
      <EuiTitle size="xs">
        <h4>Create new custom URL</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiForm>
        <EuiFormRow
          label="Label"
          className="url-label"
          compressed
        >
          <EuiFieldText
            value={label}
            onChange={(e) => onLabelChange(e, customUrl, setEditCustomUrl)}
            isInvalid={!isValidCustomUrlLabel(label)}
            compressed
          />
        </EuiFormRow>
        <EuiFormRow
          label="Link to"
          compressed
        >
          <EuiRadioGroup
            options={getLinkToOptions()}
            idSelected={type}
            onChange={(linkType) => onTypeChange(linkType, customUrl, setEditCustomUrl)}
            className="url-link-to-radio"
          />
        </EuiFormRow>

        {type === URL_TYPE.KIBANA_DASHBOARD &&
          <EuiFormRow
            label="Dashboard name"
            compressed
          >
            <EuiSelect
              options={dashboardOptions}
              value={kibanaSettings.dashboardId}
              onChange={(e) => onDashboardChange(e, customUrl, setEditCustomUrl)}
              compressed
            />
          </EuiFormRow>
        }

        {type === URL_TYPE.KIBANA_DISCOVER &&
          <EuiFormRow
            label="Index pattern"
            compressed
          >
            <EuiSelect
              options={indexPatternOptions}
              value={kibanaSettings.discoverIndexPatternId}
              onChange={(e) => onDiscoverIndexPatternChange(e, customUrl, setEditCustomUrl)}
              compressed
            />
          </EuiFormRow>
        }

        {(type === URL_TYPE.KIBANA_DASHBOARD || type === URL_TYPE.KIBANA_DISCOVER) &&
          entityOptions.length > 0 &&
          <EuiFormRow
            label="Query entities"
          >
            <EuiComboBox
              placeholder="Select entities"
              options={entityOptions}
              selectedOptions={selectedEntityOptions}
              onChange={(e) => onQueryEntitiesChange(e, customUrl, setEditCustomUrl)}
              isClearable={true}
            />
          </EuiFormRow>
        }

        {(type === URL_TYPE.KIBANA_DASHBOARD || type === URL_TYPE.KIBANA_DISCOVER) &&
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label="Time range"
                className="url-time-range"
                compressed
              >
                <EuiSelect
                  options={timeRangeOptions}
                  value={timeRange.type}
                  onChange={(e) => onTimeRangeTypeChange(e, customUrl, setEditCustomUrl)}
                  compressed
                />
              </EuiFormRow>
            </EuiFlexItem>
            {(timeRange.type === TIME_RANGE_TYPE.INTERVAL) &&
              <EuiFlexItem>
                <EuiFormRow
                  label="Interval"
                  className="url-time-range"
                  error={invalidIntervalError}
                  isInvalid={isInvalidTimeRange}
                  compressed
                >
                  <EuiFieldText
                    value={timeRange.interval}
                    onChange={(e) => onTimeRangeIntervalChange(e, customUrl, setEditCustomUrl)}
                    isInvalid={isInvalidTimeRange}
                    compressed
                  />
                </EuiFormRow>
              </EuiFlexItem>
            }
          </EuiFlexGroup>
        }

        {type === URL_TYPE.OTHER &&
          <EuiFormRow
            label="URL"
            compressed
            fullWidth={true}
          >
            <EuiTextArea
              fullWidth={true}
              rows={2}
              value={otherUrlSettings.urlValue}
              onChange={(e) => onOtherUrlValueChange(e, customUrl, setEditCustomUrl)}
              compressed
            />
          </EuiFormRow>
        }

      </EuiForm>

    </React.Fragment>
  );
}
CustomUrlEditor.propTypes = {
  customUrl: PropTypes.object,
  setEditCustomUrl: PropTypes.func.isRequired,
  dashboards: PropTypes.array.isRequired,
  indexPatterns: PropTypes.array.isRequired,
  queryEntityFieldNames: PropTypes.array.isRequired,
};


