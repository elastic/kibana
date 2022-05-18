/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiSearchBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  SearchFilterConfig,
  EuiSearchBarProps,
  Query,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { JobGroup } from '../job_group';
import { useMlKibana } from '../../../../contexts/kibana';

interface JobFilterBarProps {
  setFilters: (query: Query | null) => void;
  queryText?: string;
}

export const JobFilterBar: FC<JobFilterBarProps> = ({ queryText, setFilters }) => {
  const [error, setError] = useState<Error | null>(null);
  const {
    services: {
      mlServices: { mlApiServices },
    },
  } = useMlKibana();

  const loadGroups = useCallback(async () => {
    try {
      const response = await mlApiServices.jobs.groups();
      return response.map((g: any) => ({
        value: g.id,
        view: (
          <div className="group-item">
            <JobGroup name={g.id} />
            &nbsp;
            <span>
              <FormattedMessage
                id="xpack.ml.jobsList.jobFilterBar.jobGroupTitle"
                defaultMessage="({jobsCount, plural, one {# job} other {# jobs}})"
                values={{ jobsCount: g.jobIds.length }}
              />
            </span>
          </div>
        ),
      }));
    } catch (e) {
      return [];
    }
  }, []);

  const queryInstance: Query = useMemo(() => {
    return EuiSearchBar.Query.parse(queryText ?? '');
  }, [queryText]);

  const onChange: EuiSearchBarProps['onChange'] = ({ query, error: queryError }) => {
    if (queryError) {
      setError(queryError);
    } else {
      setFilters(query);
      setError(null);
    }
  };

  useEffect(() => {
    if (queryText !== undefined) {
      setFilters(queryInstance);
    }
  }, [queryText]);

  const filters: SearchFilterConfig[] = useMemo(
    () => [
      {
        type: 'field_value_toggle_group',
        field: 'job_state',
        items: [
          {
            value: 'opened',
            name: i18n.translate('xpack.ml.jobsList.jobFilterBar.openedLabel', {
              defaultMessage: 'Opened',
            }),
          },
          {
            value: 'closed',
            name: i18n.translate('xpack.ml.jobsList.jobFilterBar.closedLabel', {
              defaultMessage: 'Closed',
            }),
          },
          {
            value: 'failed',
            name: i18n.translate('xpack.ml.jobsList.jobFilterBar.failedLabel', {
              defaultMessage: 'Failed',
            }),
          },
        ],
      },
      {
        type: 'field_value_toggle_group',
        field: 'datafeed_state',
        items: [
          {
            value: 'started',
            name: i18n.translate('xpack.ml.jobsList.jobFilterBar.startedLabel', {
              defaultMessage: 'Started',
            }),
          },
          {
            value: 'stopped',
            name: i18n.translate('xpack.ml.jobsList.jobFilterBar.stoppedLabel', {
              defaultMessage: 'Stopped',
            }),
          },
        ],
      },
      {
        type: 'field_value_selection',
        field: 'groups',
        name: i18n.translate('xpack.ml.jobsList.jobFilterBar.groupLabel', {
          defaultMessage: 'Group',
        }),
        multiSelect: 'or',
        cache: 10000,
        options: () => loadGroups(),
      },
    ],
    []
  );

  const errorText = useMemo(() => {
    if (error === null) return '';

    return i18n.translate('xpack.ml.jobsList.jobFilterBar.invalidSearchErrorMessage', {
      defaultMessage: 'Invalid search: {errorMessage}',
      values: { errorMessage: error.message },
    });
  }, [error]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem data-test-subj="mlJobListSearchBar" grow={false}>
        <EuiSearchBar
          box={{ incremental: true }}
          query={queryInstance}
          filters={filters}
          onChange={onChange}
          className="mlJobFilterBar"
        />
        <EuiFormRow fullWidth isInvalid={error !== null} error={errorText} style={{ maxHeight: 0 }}>
          <Fragment />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
