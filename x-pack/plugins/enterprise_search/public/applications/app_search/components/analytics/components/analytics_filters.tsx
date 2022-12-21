/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';
import moment from 'moment';
import queryString from 'query-string';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiDatePickerRange,
  EuiDatePicker,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AnalyticsLogic } from '..';
import { KibanaLogic } from '../../../../shared/kibana';

import { DEFAULT_START_DATE, DEFAULT_END_DATE, SERVER_DATE_FORMAT } from '../constants';
import { convertTagsToSelectOptions } from '../utils';

export const AnalyticsFilters: React.FC = () => {
  const { allTags } = useValues(AnalyticsLogic);
  const { history } = useValues(KibanaLogic);

  // Parse out existing filters from URL query string
  const { start, end, tag } = queryString.parse(history.location.search);
  const [startDate, setStartDate] = useState(
    start ? moment(start, SERVER_DATE_FORMAT) : moment(DEFAULT_START_DATE)
  );
  const [endDate, setEndDate] = useState(
    end ? moment(end, SERVER_DATE_FORMAT) : moment(DEFAULT_END_DATE)
  );
  const [currentTag, setCurrentTag] = useState((tag as string) || '');

  // Set the current URL query string on filter
  const onApplyFilters = () => {
    const search = queryString.stringify({
      start: moment(startDate).format(SERVER_DATE_FORMAT),
      end: moment(endDate).format(SERVER_DATE_FORMAT),
      tag: currentTag || undefined,
    });
    history.push({ search });
  };

  const hasInvalidDateRange = startDate > endDate;

  return (
    <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="m">
      <EuiFlexItem>
        <EuiSelect
          options={convertTagsToSelectOptions(allTags)}
          value={currentTag}
          onChange={(e) => setCurrentTag(e.target.value)}
          aria-label={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.analytics.filters.tagAriaLabel',
            { defaultMessage: 'Filter by analytics tag"' }
          )}
          fullWidth
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiDatePickerRange
          startDateControl={
            <EuiDatePicker
              selected={startDate}
              onChange={(date) => date && setStartDate(date)}
              startDate={startDate}
              endDate={endDate}
              isInvalid={hasInvalidDateRange}
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.analytics.filters.startDateAriaLabel',
                { defaultMessage: 'Filter by start date' }
              )}
              locale={i18n.getLocale()}
            />
          }
          endDateControl={
            <EuiDatePicker
              selected={endDate}
              onChange={(date) => date && setEndDate(date)}
              startDate={startDate}
              endDate={endDate}
              isInvalid={hasInvalidDateRange}
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.analytics.filters.endDateAriaLabel',
                { defaultMessage: 'Filter by end date' }
              )}
              locale={i18n.getLocale()}
            />
          }
          fullWidth
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton fill isDisabled={hasInvalidDateRange} onClick={onApplyFilters}>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.analytics.filters.applyButtonLabel',
            { defaultMessage: 'Apply filters' }
          )}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
