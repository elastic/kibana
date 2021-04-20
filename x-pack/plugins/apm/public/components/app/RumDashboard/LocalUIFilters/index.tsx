/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiAccordion,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { Filter } from './Filter';
import { useLocalUIFilters } from '../hooks/useLocalUIFilters';
import { LocalUIFilterName } from '../../../../../common/ui_filter';
import { useBreakPoints } from '../../../../hooks/use_break_points';

interface Props {
  filterNames: LocalUIFilterName[];
  params?: Record<string, string | number | boolean | undefined>;
  showCount?: boolean;
  children?: React.ReactNode;
  shouldFetch?: boolean;
}

const ButtonWrapper = euiStyled.div`
  display: inline-block;
`;

function LocalUIFilters({
  params,
  filterNames,
  children,
  showCount = true,
  shouldFetch = true,
}: Props) {
  const { filters, setFilterValue, clearValues } = useLocalUIFilters({
    filterNames,
    params,
    shouldFetch,
  });

  const hasValues = filters.some((filter) => filter.value.length > 0);

  const { isSmall } = useBreakPoints();

  const title = (
    <EuiTitle size="s">
      <h3>
        {i18n.translate('xpack.apm.localFiltersTitle', {
          defaultMessage: 'Filters',
        })}
      </h3>
    </EuiTitle>
  );

  const content = (
    <>
      {children}
      {filters.map((filter) => {
        return (
          <React.Fragment key={filter.name}>
            <Filter
              {...filter}
              onChange={(value) => {
                setFilterValue(filter.name, value);
              }}
              showCount={showCount}
            />
            <EuiHorizontalRule margin="none" />
          </React.Fragment>
        );
      })}
      {hasValues ? (
        <>
          <EuiSpacer size="s" />
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
        </>
      ) : null}
    </>
  );

  return isSmall ? (
    <EuiAccordion id={'uxFilterAccordion'} buttonContent={title}>
      {content}
    </EuiAccordion>
  ) : (
    <>
      {title}
      <EuiSpacer size="s" />
      {content}
    </>
  );
}

export { LocalUIFilters };
