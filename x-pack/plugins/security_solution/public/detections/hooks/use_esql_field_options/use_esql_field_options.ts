/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ExpressionsStart, Datatable } from '@kbn/expressions-plugin/public';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';

import { useKibana } from '@kbn/kibana-react-plugin/public';

type UseEsqlFieldOptions = (query: string | undefined) => {
  isLoading: boolean;
  options: Array<EuiComboBoxOptionOption<string>>;
};

export const useEsqlFieldOptions: UseEsqlFieldOptions = (query) => {
  const [queryDebounced, setQueryDebounced] = useState<string | undefined>(undefined);
  const kibana = useKibana<{ expressions: ExpressionsStart }>();

  useDebounce(() => setQueryDebounced(query), 300, [query]);

  const { expressions } = kibana.services;

  const queryToPerform = `${queryDebounced} | limit 2`;

  const { data, isLoading } = useQuery<Datatable | undefined>(
    [`${queryDebounced?.trim()}`],
    async () => {
      if (!queryDebounced) {
        return;
      }
      // return undefined;
      return fetchFieldsFromESQL({ esql: queryToPerform }, expressions);
    },
    {
      staleTime: 60 * 1000,
    }
  );

  const options = (data?.columns ?? []).map(({ id }) => ({ label: id }));

  return {
    options,
    isLoading,
  };
};

// export const useEsqlFieldOptions: UseEsqlFieldOptions = (query) => {
//   const [queryDebounced, setQueryDebounced] = useState<string | undefined>(undefined);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
//   const kibana = useKibana<{ expressions: ExpressionsStart }>();

//   useDebounce(() => setQueryDebounced(query), 300, [query]);

//   const { expressions } = kibana.services;

//   useEffect(() => {
//     const queryToPerform = `${queryDebounced} | limit 2`;

//     fetchFieldsFromESQL({ esql: queryToPerform }, expressions)
//       .then((data) => {
//         setIsLoading(true);
//         setOptions((data?.columns ?? []).map(({ id }) => ({ label: id })));
//       })
//       .finally(() => {
//         setIsLoading(false);
//       });
//   }, [expressions, queryDebounced]);

//   console.log('>>>>> queryDebounced', queryDebounced, JSON.stringify(options, null, 2));
//   return {
//     options,
//     isLoading,
//   };
// };
