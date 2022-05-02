/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import styled from 'styled-components';
import { capitalize } from 'lodash';
import { FieldValueSuggestions, useInspectorContext } from '@kbn/observability-plugin/public';
import { useFilterUpdate } from '../../../hooks/use_filter_update';
import { useSelectedFilters } from '../../../hooks/use_selected_filters';
import { SelectedFilters } from './selected_filters';
import { useUptimeDataView } from '../../../contexts/uptime_data_view_context';
import { useGetUrlParams } from '../../../hooks';
import { EXCLUDE_RUN_ONCE_FILTER } from '../../../../../common/constants/client_defaults';

const Container = styled(EuiFilterGroup)`
  margin-bottom: 10px;
`;

export const FilterGroup = () => {
  const [updatedFieldValues, setUpdatedFieldValues] = useState<{
    fieldName: string;
    values: string[];
    notValues: string[];
  }>({ fieldName: '', values: [], notValues: [] });

  useFilterUpdate(
    updatedFieldValues.fieldName,
    updatedFieldValues.values,
    updatedFieldValues.notValues
  );

  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const { inspectorAdapters } = useInspectorContext();

  const { filtersList } = useSelectedFilters();

  const dataView = useUptimeDataView();

  const onFilterFieldChange = useCallback(
    (fieldName: string, values: string[], notValues: string[]) => {
      setUpdatedFieldValues({ fieldName, values, notValues });
    },
    []
  );

  return (
    <>
      <Container>
        {dataView &&
          filtersList.map(({ field, label, selectedItems, excludedItems }) => (
            <FieldValueSuggestions
              key={field}
              compressed={false}
              dataViewTitle={dataView.title}
              sourceField={field}
              label={label}
              selectedValue={selectedItems}
              excludedValue={excludedItems}
              onChange={(values, notValues) =>
                onFilterFieldChange(field, values ?? [], notValues ?? [])
              }
              asCombobox={false}
              asFilterButton={true}
              forceOpen={false}
              filters={[
                {
                  exists: {
                    field: 'summary',
                  },
                },
                EXCLUDE_RUN_ONCE_FILTER,
              ]}
              cardinalityField="monitor.id"
              time={{ from: dateRangeStart, to: dateRangeEnd }}
              inspector={{
                adapter: inspectorAdapters.requests,
                title: 'get' + capitalize(label) + 'FilterValues',
              }}
            />
          ))}
      </Container>
      <SelectedFilters onChange={onFilterFieldChange} />
    </>
  );
};
