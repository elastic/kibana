/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { Projection } from '../../../../../common/projections';
import { useLocalUIFilters } from '../../../../hooks/useLocalUIFilters';
import { URLSearch } from './URLSearch';
import { LocalUIFilters } from '../../../shared/LocalUIFilters';
import { UrlList } from './UrlList';
import { I18LABELS } from '../translations';

export function URLFilter() {
  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['transactionUrl'],
      projection: Projection.rumOverview,
    };

    return config;
  }, []);

  const { filters, setFilterValue } = useLocalUIFilters({
    ...localUIFiltersConfig,
  });

  return (
    <span data-cy="csmUrlFilter">
      <EuiSpacer size="s" />
      <EuiTitle size="xxxs" textTransform="uppercase">
        <h4>{I18LABELS.url}</h4>
      </EuiTitle>
      <URLSearch
        onChange={(value) => {
          setFilterValue('transactionUrl', value);
        }}
      />
      <EuiSpacer size="s" />
      {filters.map(({ value, name }) => {
        return (
          <React.Fragment key={name}>
            {value.length ? (
              <>
                <UrlList
                  onRemove={(val) => {
                    setFilterValue(
                      'transactionUrl',
                      value.filter((v) => val !== v)
                    );
                  }}
                  value={value}
                />
                <EuiSpacer />
              </>
            ) : null}
          </React.Fragment>
        );
      })}
      <EuiSpacer size="s" />
    </span>
  );
}
