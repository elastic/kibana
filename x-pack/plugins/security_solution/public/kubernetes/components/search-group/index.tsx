/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBoxOptionOption, EuiComboBox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from '../../translations';
// import { CSSObject } from '@emotion/react';

export interface SearchFields {
  cluster: EuiComboBoxOptionOption<string>;
  groupBy?: EuiComboBoxOptionOption<string>;
  sortBy: EuiComboBoxOptionOption<string>;
}

interface AlertsListDeps {
  searchFields: SearchFields;
  onChange: (searchFields: SearchFields) => void;
  clusterOptions: Array<EuiComboBoxOptionOption<string>>;
  groupByOptions: Array<EuiComboBoxOptionOption<string>>;
  sortByOptions: Array<EuiComboBoxOptionOption<string>>;
}

export const SearchGroup = ({
  searchFields,
  onChange,
  clusterOptions,
  groupByOptions,
  sortByOptions,
}: AlertsListDeps) => {
  const handleOnClusterChange = (clusters: Array<EuiComboBoxOptionOption<string>>) => {
    if (clusters[0]?.value) {
      onChange({ ...searchFields, cluster: clusters[0] });
    }
  };
  const handleOnGroupByChange = (groupBys: Array<EuiComboBoxOptionOption<string>>) => {
    if (groupBys[0]?.value) {
      onChange({ ...searchFields, groupBy: groupBys[0] });
    }
  };
  const handleOnSortByChange = (sortBys: Array<EuiComboBoxOptionOption<string>>) => {
    if (sortBys[0]?.value) {
      onChange({ ...searchFields, sortBy: sortBys[0] });
    }
  };

  return (
    <EuiFlexGroup component="span" gutterSize="m">
      <EuiFlexItem component="span" grow={false}>
        <EuiComboBox
          prepend={i18n.SEARCH_GROUP_CLUSTER}
          singleSelection={{ asPlainText: true }}
          options={clusterOptions}
          selectedOptions={[searchFields.cluster]}
          onChange={handleOnClusterChange}
          isClearable={false}
        />
      </EuiFlexItem>
      <EuiFlexItem component="span" grow={false}>
        <EuiComboBox
          css={{ minWidth: '312px' }}
          prepend={i18n.SEARCH_GROUP_GROUP_BY}
          singleSelection={{ asPlainText: true }}
          options={groupByOptions}
          selectedOptions={searchFields.groupBy ? [searchFields.groupBy] : []}
          onChange={handleOnGroupByChange}
          isClearable={false}
        />
      </EuiFlexItem>
      <EuiFlexItem component="span" grow={false}>
        <EuiComboBox
          prepend={i18n.SEARCH_GROUP_SORT_BY}
          singleSelection={{ asPlainText: true }}
          options={sortByOptions}
          selectedOptions={[searchFields.sortBy]}
          onChange={handleOnSortByChange}
          isClearable={false}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
