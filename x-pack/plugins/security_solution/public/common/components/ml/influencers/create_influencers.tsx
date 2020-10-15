/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { isEmpty } from 'lodash/fp';
import { getEntries } from '../get_entries';

export const createKeyAndValue = (influencer: Record<string, string>): string => {
  const [key, value] = getEntries(influencer);
  if (key != null && value != null) {
    return `${key}: "${value}"`;
  } else {
    return '';
  }
};

export const createInfluencers = (influencers: Array<Record<string, string>> = []): JSX.Element[] =>
  influencers
    .filter((influencer) => !isEmpty(influencer))
    .map((influencer) => {
      const keyAndValue = createKeyAndValue(influencer);
      return (
        <EuiFlexItem key={keyAndValue} grow={false}>
          {keyAndValue}
        </EuiFlexItem>
      );
    });
