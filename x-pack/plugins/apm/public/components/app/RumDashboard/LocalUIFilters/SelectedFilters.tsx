/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FilterValueLabel } from '../../../../../../observability/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { useFetcher } from '../../../../hooks/use_fetcher';
import {
  IndexPattern,
  IndexPatternSpec,
} from '../../../../../../../../src/plugins/data/common';
import { FiltersUIHook } from '../hooks/useLocalUIFilters';
import { LocalUIFilterName } from '../../../../../common/ui_filter';
import { DataPublicPluginStart } from '../../../../../../../../src/plugins/data/public';

interface Props {
  indexPatternTitle?: string;
  filters: FiltersUIHook['filters'];
  onChange: (name: LocalUIFilterName, values: string[]) => void;
}
export function SelectedFilters({
  indexPatternTitle,
  onChange,
  filters,
}: Props) {
  const { uiFilters } = useUrlParams();

  const {
    services: {
      data: { indexPatterns },
    },
  } = useKibana<{ data: DataPublicPluginStart }>();

  const { data: indexPattern } = useFetcher<
    Promise<IndexPattern | undefined>
  >(async () => {
    if (indexPatternTitle) {
      return indexPatterns.create({
        pattern: indexPatternTitle,
      } as IndexPatternSpec);
    }
  }, [indexPatternTitle, indexPatterns]);

  return indexPattern ? (
    <EuiFlexGroup gutterSize="xs">
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
              />
            </EuiFlexItem>
          ))}
        </Fragment>
      ))}
    </EuiFlexGroup>
  ) : null;
}
