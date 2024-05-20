/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ReactElement } from 'react';
import { EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface PopoverPlaceholderProps {
  placeholderImage: ReactElement;
}

export const PopoverPlaceholder: FC<PopoverPlaceholderProps> = ({ placeholderImage }) => {
  return (
    <EuiFlexGroup
      style={{ minHeight: 300 }}
      data-test-subj="nav-search-no-results"
      direction="column"
      gutterSize="xs"
      alignItems="center"
      justifyContent="center"
    >
      <EuiFlexItem grow={false}>
        {placeholderImage}
        <EuiText size="m">
          <p>
            <FormattedMessage
              id="xpack.globalSearchBar.searchBar.noResultsHeading"
              defaultMessage="No results found"
            />
          </p>
        </EuiText>

        <p>
          <FormattedMessage
            id="xpack.globalSearchBar.searchBar.noResults"
            defaultMessage="Try searching for applications, dashboards, visualizations, and more."
          />
        </p>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
