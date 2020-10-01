/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { EuiSearchBar, EuiFormErrorText, Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface SearchBarProps {
  onChange: (query: Query) => void;
}

const parseErrorMsg = i18n.translate(
  'savedObjectsManagement.objectsTable.searchBar.unableToParseQueryErrorMessage',
  { defaultMessage: 'Unable to parse query' }
);

export const SearchBar: FC<SearchBarProps> = ({ onChange }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <>
      <EuiSearchBar
        box={{ 'data-test-subj': 'tagsSearchBar' }}
        onChange={(changes) => {
          if (changes.error) {
            setErrorMessage(changes.error.message);
          } else {
            setErrorMessage(null);
            onChange(changes.query);
          }
        }}
      />
      {errorMessage && <EuiFormErrorText>{`${parseErrorMsg}. ${errorMessage}`}</EuiFormErrorText>}
    </>
  );
};
