/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, FC } from 'react';

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
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

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataViewListItem } from '@kbn/data-views-plugin/common';
import { isValidCustomUrlSettingsTimeRange } from './utils';
import { isValidLabel } from '../../../util/custom_url_utils';

import { TIME_RANGE_TYPE, URL_TYPE } from './constants';
import { UrlConfig } from '../../../../../common/types/custom_urls';

function getLinkToOptions() {
  return [
    {
      id: URL_TYPE.KIBANA_DASHBOARD,
      label: i18n.translate('xpack.ml.customUrlEditor.kibanaDashboardLabel', {
        defaultMessage: 'Kibana dashboard',
      }),
    },
    {
      id: URL_TYPE.KIBANA_DISCOVER,
      label: i18n.translate('xpack.ml.customUrlEditor.discoverLabel', {
        defaultMessage: 'Discover',
      }),
    },
    {
      id: URL_TYPE.OTHER,
      label: i18n.translate('xpack.ml.customUrlEditor.otherLabel', {
        defaultMessage: 'Other',
      }),
    },
  ];
}

interface CustomUrlEditorProps {
  customUrl: any;
  setEditCustomUrl: (url: any) => void;
  savedCustomUrls: UrlConfig[];
  dashboards: any[];
  dataViewListItems: DataViewListItem[];
  queryEntityFieldNames: string[];
}

/*
 * React component for the form for editing a custom URL.
 */
export const CustomUrlEditor: FC<CustomUrlEditorProps> = ({
  customUrl,
  setEditCustomUrl,
  savedCustomUrls,
  dashboards,
  dataViewListItems,
  queryEntityFieldNames,
}) => {
  if (customUrl === undefined) {
    return null;
  }

  const onLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditCustomUrl({
      ...customUrl,
      label: e.target.value,
    });
  };

  const onTypeChange = (linkType: string) => {
    setEditCustomUrl({
      ...customUrl,
      type: linkType,
    });
  };

  const onDashboardChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const kibanaSettings = customUrl.kibanaSettings;
    setEditCustomUrl({
      ...customUrl,
      kibanaSettings: {
        ...kibanaSettings,
        dashboardId: e.target.value,
      },
    });
  };

  const onDiscoverIndexPatternChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const kibanaSettings = customUrl.kibanaSettings;
    setEditCustomUrl({
      ...customUrl,
      kibanaSettings: {
        ...kibanaSettings,
        discoverIndexPatternId: e.target.value,
      },
    });
  };

  const onQueryEntitiesChange = (selectedOptions: EuiComboBoxOptionOption[]) => {
    const selectedFieldNames = selectedOptions.map((option) => option.label);

    const kibanaSettings = customUrl.kibanaSettings;
    setEditCustomUrl({
      ...customUrl,
      kibanaSettings: {
        ...kibanaSettings,
        queryFieldNames: selectedFieldNames,
      },
    });
  };

  const onOtherUrlValueChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setEditCustomUrl({
      ...customUrl,
      otherUrlSettings: {
        urlValue: e.target.value,
      },
    });
  };

  const onTimeRangeTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const timeRange = customUrl.timeRange;
    setEditCustomUrl({
      ...customUrl,
      timeRange: {
        ...timeRange,
        type: e.target.value,
      },
    });
  };

  const onTimeRangeIntervalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const timeRange = customUrl.timeRange;
    setEditCustomUrl({
      ...customUrl,
      timeRange: {
        ...timeRange,
        interval: e.target.value,
      },
    });
  };

  const { label, type, timeRange, kibanaSettings, otherUrlSettings } = customUrl;

  const dashboardOptions = dashboards.map((dashboard) => {
    return { value: dashboard.id, text: dashboard.title };
  });

  const dataViewOptions = dataViewListItems.map(({ id, title }) => {
    return { value: id, text: title };
  });

  const entityOptions = queryEntityFieldNames.map((fieldName) => ({ label: fieldName }));
  let selectedEntityOptions: EuiComboBoxOptionOption[] = [];
  if (kibanaSettings !== undefined && kibanaSettings.queryFieldNames !== undefined) {
    const queryFieldNames: string[] = kibanaSettings.queryFieldNames;
    selectedEntityOptions = queryFieldNames.map((fieldName) => ({ label: fieldName }));
  }

  const timeRangeOptions = Object.values(TIME_RANGE_TYPE).map((timeRangeType) => ({
    value: timeRangeType,
    text: timeRangeType,
  }));

  const isInvalidLabel = !isValidLabel(label, savedCustomUrls);
  const invalidLabelError = isInvalidLabel
    ? [
        i18n.translate('xpack.ml.customUrlsEditor.invalidLabelErrorMessage', {
          defaultMessage: 'A unique label must be supplied',
        }),
      ]
    : [];

  const isInvalidTimeRange = !isValidCustomUrlSettingsTimeRange(timeRange);
  const invalidIntervalError = isInvalidTimeRange
    ? [
        i18n.translate('xpack.ml.customUrlsList.invalidIntervalFormatErrorMessage', {
          defaultMessage: 'Invalid interval format',
        }),
      ]
    : [];

  return (
    <>
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.ml.customUrlsEditor.createNewCustomUrlTitle"
            defaultMessage="Create new custom URL"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiForm className="ml-edit-url-form" data-test-subj="mlJobCustomUrlForm">
        <EuiFormRow
          label={
            <FormattedMessage id="xpack.ml.customUrlsEditor.labelLabel" defaultMessage="Label" />
          }
          className="url-label"
          error={invalidLabelError}
          isInvalid={isInvalidLabel}
          display="rowCompressed"
        >
          <EuiFieldText
            name="label"
            value={label}
            onChange={onLabelChange}
            isInvalid={isInvalidLabel}
            compressed
            data-test-subj="mlJobCustomUrlLabelInput"
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage id="xpack.ml.customUrlsEditor.linkToLabel" defaultMessage="Link to" />
          }
          display="rowCompressed"
        >
          <EuiRadioGroup
            options={getLinkToOptions()}
            idSelected={type}
            onChange={onTypeChange}
            className="url-link-to-radio"
            data-test-subj="mlJobCustomUrlLinkToTypeInput"
          />
        </EuiFormRow>

        {type === URL_TYPE.KIBANA_DASHBOARD && (
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.customUrlsEditor.dashboardNameLabel"
                defaultMessage="Dashboard name"
              />
            }
            display="rowCompressed"
          >
            <EuiSelect
              options={dashboardOptions}
              value={kibanaSettings.dashboardId}
              onChange={onDashboardChange}
              data-test-subj="mlJobCustomUrlDashboardNameInput"
              compressed
            />
          </EuiFormRow>
        )}

        {type === URL_TYPE.KIBANA_DISCOVER && (
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.customUrlsEditor.dataViewLabel"
                defaultMessage="Data view"
              />
            }
            display="rowCompressed"
          >
            <EuiSelect
              options={dataViewOptions}
              value={kibanaSettings.discoverIndexPatternId}
              onChange={onDiscoverIndexPatternChange}
              data-test-subj="mlJobCustomUrlDiscoverIndexPatternInput"
              compressed
            />
          </EuiFormRow>
        )}

        {(type === URL_TYPE.KIBANA_DASHBOARD || type === URL_TYPE.KIBANA_DISCOVER) &&
          entityOptions.length > 0 && (
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ml.customUrlsEditor.queryEntitiesLabel"
                  defaultMessage="Query entities"
                />
              }
            >
              <EuiComboBox
                placeholder={i18n.translate('xpack.ml.customUrlsEditor.selectEntitiesPlaceholder', {
                  defaultMessage: 'Select entities',
                })}
                options={entityOptions}
                selectedOptions={selectedEntityOptions}
                onChange={onQueryEntitiesChange}
                isClearable={true}
                data-test-subj="mlJobCustomUrlQueryEntitiesInput"
              />
            </EuiFormRow>
          )}

        {(type === URL_TYPE.KIBANA_DASHBOARD || type === URL_TYPE.KIBANA_DISCOVER) && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.ml.customUrlsEditor.timeRangeLabel"
                      defaultMessage="Time range"
                    />
                  }
                  className="url-time-range"
                  display="rowCompressed"
                >
                  <EuiSelect
                    options={timeRangeOptions}
                    value={timeRange.type}
                    onChange={onTimeRangeTypeChange}
                    data-test-subj="mlJobCustomUrlTimeRangeInput"
                    compressed
                  />
                </EuiFormRow>
              </EuiFlexItem>
              {timeRange.type === TIME_RANGE_TYPE.INTERVAL && (
                <EuiFlexItem>
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.ml.customUrlsEditor.intervalLabel"
                        defaultMessage="Interval"
                      />
                    }
                    className="url-time-range"
                    error={invalidIntervalError}
                    isInvalid={isInvalidTimeRange}
                    display="rowCompressed"
                  >
                    <EuiFieldText
                      value={timeRange.interval}
                      onChange={onTimeRangeIntervalChange}
                      isInvalid={isInvalidTimeRange}
                      data-test-subj="mlJobCustomUrlTimeRangeIntervalInput"
                      compressed
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </>
        )}

        {type === URL_TYPE.OTHER && (
          <EuiFormRow
            label={
              <FormattedMessage id="xpack.ml.customUrlsEditor.urlLabel" defaultMessage="URL" />
            }
            display="rowCompressed"
            fullWidth={true}
          >
            <EuiTextArea
              fullWidth={true}
              rows={2}
              value={otherUrlSettings.urlValue}
              onChange={onOtherUrlValueChange}
              data-test-subj="mlJobCustomUrlOtherTypeUrlInput"
              compressed
            />
          </EuiFormRow>
        )}
      </EuiForm>
    </>
  );
};
