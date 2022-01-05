/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHistory } from 'react-router-dom';
import { CSP_FINDINGS_PATH } from './constants';

export const useNavigateToCSPFindings = () => {
  const history = useHistory();

  return {
    navigate: (query: string) =>
      history.push({
        pathname: CSP_FINDINGS_PATH,
        search: new URLSearchParams([['query', query]].filter((p) => !!p[1])).toString(),
      }),
  };
};
