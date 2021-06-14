/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FilterValueLabel } from '../../../../../../observability/public';
import { FiltersUIHook } from '../hooks/useLocalUIFilters';
import { LocalUIFilterName } from '../../../../../common/ui_filter';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { UrlList } from '../URLFilter/UrlList';

interface Props {
  IndexPattern?: IndexPattern;
  filters: FiltersUIHook['filters'];
  onChange: (name: LocalUIFilterName, values: string[]) => void;
  clearValues: () => void;
}

export function SelectedFilters({
  indexPattern,
  onChange,
  filters,
  clearValues,
}: Props) {
  const { uiFilters } = useUrlParams();
  const { transactionUrl } = uiFilters;

  const urlValues = transactionUrl ?? [];

  const hasValues = filters.some((filter) => filter.value?.length > 0);

  return indexPattern && (hasValues || urlValues.length > 0) ? (
    <EuiFlexGroup alignItems="center" gutterSize="xs" wrap>
      <UrlList
        indexPattern={indexPattern}
        onChange={onChange}
        values={urlValues}
      />

      {(filters ?? []).map(({ name, title, fieldName }) => (
        <Fragment key={name}>
          {((uiFilters?.[name] ?? []) as string[]).map((value) => (
            <EuiFlexItem key={name + value} grow={false}>
              <FilterValueLabel
                indexPattern={indexPattern}
                removeFilter={() => {
                  onChange(
                    name,
                    (uiFilters?.[name] as string[]).filter(
                      (valT) => valT !== value
                    )
                  );
                }}
                invertFilter={(val) => {}}
                field={fieldName}
                value={value}
                negate={false}
                label={title}
                allowExclusion={false}
              />
            </EuiFlexItem>
          ))}
        </Fragment>
      ))}

      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          iconType="cross"
          flush="left"
          onClick={clearValues}
          data-cy="clearFilters"
        >
          {i18n.translate('xpack.apm.clearFilters', {
            defaultMessage: 'Clear filters',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
}
