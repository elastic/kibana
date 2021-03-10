/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { useUrlStorage } from '../hooks/use_url_strorage';
import { SeriesUrl } from '../types';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FieldLabels } from '../configurations/constants';

interface Props {}
export const SelectedFilters = (props: Props) => {
  const storage = useUrlStorage();

  const { filters = [] } = storage.get<SeriesUrl>('elastic-co') ?? {};

  const style = { maxWidth: 250 };

  return (
    <EuiFlexGroup wrap gutterSize="xs">
      {filters.map(({ field, values, notValues }) => (
        <Fragment key={field}>
          {(values ?? []).map((val) => (
            <EuiFlexItem key={field + val}>
              <EuiButton fill size="s" iconType="cross" iconSide="right" style={style}>
                {FieldLabels[field]}: {val}
              </EuiButton>
            </EuiFlexItem>
          ))}
          {(notValues ?? []).map((val) => (
            <EuiFlexItem key={field + val}>
              <EuiButton fill size="s" iconType="cross" iconSide="right" style={style}>
                {FieldLabels[field]}: {val}
              </EuiButton>
            </EuiFlexItem>
          ))}
        </Fragment>
      ))}
    </EuiFlexGroup>
  );
};
