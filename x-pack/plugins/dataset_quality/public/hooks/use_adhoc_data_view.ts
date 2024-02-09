/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { useSelector } from '@xstate/react';
import { useEffect, useState } from 'react';
import { SuggestionsAbstraction } from '@kbn/unified-search-plugin/public/typeahead/suggestions_component';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { useKibanaContextForPlugin } from '../utils';

export function useAdHocDataView(suggestions: SuggestionsAbstraction) {
  const {
    services: { data },
  } = useKibanaContextForPlugin();

  const { service } = useDatasetQualityContext();

  const type = useSelector(service, (state) => state.context.type);

  const [dataView, setDataView] = useState<DataView | undefined>();

  useEffect(() => {
    async function fetchDataView() {
      return await data.dataViews.create(
        {
          title: `${type}-*-*`,
        },
        undefined,
        false
      );
    }

    fetchDataView().then((dView: DataView) => {
      const spec = dView.toSpec();

      const suggestionKeys = Object.keys(suggestions.fields);
      const filteredKeys = (Object.keys(spec?.fields ?? {}) ?? []).filter((field) =>
        suggestionKeys.includes(field)
      );

      setDataView({
        ...spec,
        fields: filteredKeys.map((field) => {
          return {
            ...spec?.fields?.[field],
            ...(suggestions.fields[spec?.fields?.[field].name!]
              ? {
                  customLabel: suggestions.fields[spec?.fields?.[field].name!].displayField,
                }
              : {}),
            ...(spec?.fields?.[field].esTypes?.includes('flattened') ? { type: 'string' } : {}),
          };
        }),
      } as unknown as DataView);
    });
  }, [data.dataViews, suggestions.fields, type]);

  return { dataView };
}
