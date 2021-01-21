/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { useValues } from 'kea';

import queryString from 'query-string';
import moment from 'moment';

import { i18n } from '@kbn/i18n';
import {
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiDatePickerRange,
  EuiDatePicker,
  EuiButton,
} from '@elastic/eui';

import { KibanaLogic } from '../../../../shared/kibana';
import { LogRetentionTooltip, LogRetentionOptions } from '../../log_retention';

import { AnalyticsLogic } from '../';
import { DEFAULT_START_DATE, DEFAULT_END_DATE, SERVER_DATE_FORMAT } from '../constants';
import { convertTagsToSelectOptions } from '../utils';

interface Props {
  title: string;
}
export const AnalyticsHeader: React.FC<Props> = ({ title }) => {
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
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiFlexGroup alignItems="center" justifyContent="flexStart" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>{title}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LogRetentionTooltip type={LogRetentionOptions.Analytics} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="m">
          <EuiFlexItem grow={false}>
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
          <EuiFlexItem grow={false}>
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
      </EuiPageHeaderSection>
    </EuiPageHeader>
  );
};
