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
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { useFetcher } from '../../../../hooks/use_fetcher';
import {
  IndexPattern,
  IndexPatternSpec,
} from '../../../../../../../../src/plugins/data/common';
import { FiltersUIHook } from '../hooks/useLocalUIFilters';
import { LocalUIFilterName } from '../../../../../common/ui_filter';
import { DataPublicPluginStart } from '../../../../../../../../src/plugins/data/public';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';

interface Props {
  indexPatternTitle?: string;
  filters: FiltersUIHook['filters'];
  onChange: (name: LocalUIFilterName, values: string[]) => void;
  clearValues: () => void;
}

export function SelectedFilters({
  indexPatternTitle,
  onChange,
  filters,
  clearValues,
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

  const hasValues = filters.some((filter) => filter.value?.length > 0);

  return indexPattern && hasValues ? (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
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
      </EuiFlexItem>
      <EuiFlexItem>
        <ButtonWrapper>
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
        </ButtonWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
}

const ButtonWrapper = euiStyled.div`
  display: inline-block;
`;
