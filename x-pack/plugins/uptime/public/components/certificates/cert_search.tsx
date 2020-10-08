/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import styled from 'styled-components';
import * as labels from './translations';

const WrapFieldSearch = styled('div')`
  max-width: 700px;
`;

interface Props {
  setSearch: (val: string) => void;
}

export const CertificateSearch: React.FC<Props> = ({ setSearch }) => {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  return (
    <WrapFieldSearch>
      <EuiFieldSearch
        data-test-subj="uptimeCertSearch"
        placeholder={labels.SEARCH_CERTS}
        onChange={onChange}
        isClearable={true}
        aria-label={labels.SEARCH_CERTS}
        fullWidth={true}
      />
    </WrapFieldSearch>
  );
};
