/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiImage, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface PopoverPlaceholderProps {
  darkMode: boolean;
  basePath: string;
}

export const PopoverPlaceholder: FC<PopoverPlaceholderProps> = ({ basePath, darkMode }) => {
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
        <EuiImage
          alt={i18n.translate('xpack.globalSearchBar.searchBar.noResultsImageAlt', {
            defaultMessage: 'Illustration of black hole',
          })}
          size="fullWidth"
          url={`${basePath}illustration_product_no_search_results_${
            darkMode ? 'dark' : 'light'
          }.svg`}
        />

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
