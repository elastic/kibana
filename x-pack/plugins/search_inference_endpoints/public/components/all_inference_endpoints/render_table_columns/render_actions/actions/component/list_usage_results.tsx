/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { InferenceUsageInfo } from '../../../../types';
import * as i18n from '../delete/confirm_delete_endpoint/translations';
import { IndexItem } from './index_item';
import { PipelineItem } from './pipeline_item';

interface ListUsageResultsProps {
  list: InferenceUsageInfo[];
}

export const ListUsageResults: React.FC<ListUsageResultsProps> = ({ list }) => {
  const [term, setTerm] = useState<string>('');

  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexItem>
        <EuiFieldSearch
          placeholder={i18n.SEARCH_LABEL}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          isClearable={true}
          aria-label={i18n.SEARCH_ARIA_LABEL}
          fullWidth={true}
          data-test-subj="usageFieldSearch"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {list
          .filter((item) => item.id.toLowerCase().includes(term.toLowerCase()))
          .map((item, id) => {
            if (item.type === 'Pipeline') {
              return <PipelineItem usageItem={item} key={id} />;
            } else {
              return <IndexItem usageItem={item} key={id} />;
            }
          })}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
