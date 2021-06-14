/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { FilterValueLabel } from '../../../../../../observability/public';
import { LocalUIFilterName } from '../../../../../common/ui_filter';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common';

interface Props {
  values: string[];
  IndexPattern?: IndexPattern;
  onChange: (name: LocalUIFilterName, values: string[]) => void;
}

const formatUrlValue = (val: string) => {
  const maxUrlToDisplay = 30;
  const urlLength = val.length;
  if (urlLength < maxUrlToDisplay) {
    return val;
  }
  const urlObj = new URL(val);
  if (urlObj.pathname === '/') {
    return val;
  }
  const domainVal = urlObj.hostname;
  const extraLength = urlLength - maxUrlToDisplay;
  const extraDomain = domainVal.substring(0, extraLength);

  if (urlObj.pathname.length + 7 > maxUrlToDisplay) {
    return val.replace(domainVal, '..');
  }

  return val.replace(extraDomain, '..');
};

export function UrlList({ values, onChange, indexPattern }: Props) {
  const name = 'transactionUrl';

  if (!indexPattern) {
    return null;
  }

  return (
    <>
      {values.map((value) => (
        <EuiFlexItem key={value} grow={false}>
          <FilterValueLabel
            indexPattern={indexPattern}
            removeFilter={() => {
              onChange(name, value);
            }}
            invertFilter={(val) => {}}
            field={'url.full'}
            value={formatUrlValue(value)}
            negate={false}
            label={'URL'}
            allowExclusion={false}
          />
        </EuiFlexItem>
      ))}
    </>
  );
}
