/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty } from 'lodash';
import { ExistsFilter } from '@kbn/es-query';
import FieldValueSuggestions from '../../../field_value_suggestions';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';
import { ESFilter } from '../../../../../../../../../src/core/types/elasticsearch';
import { PersistableFilter } from '../../../../../../../lens/common';
import { buildPhrasesFilter } from '../../configurations/utils';
import { SeriesConfig } from '../../types';
import { ALL_VALUES_SELECTED } from '../../../field_value_suggestions/field_value_combobox';

interface Props {
  seriesId: string;
  field: string;
  seriesConfig: SeriesConfig;
  onChange: (field: string, value?: string[]) => void;
}

export function ReportDefinitionField({ seriesId, field, seriesConfig, onChange }: Props) {
  const { getSeries } = useSeriesStorage();

  const series = getSeries(seriesId);

  const { indexPattern } = useAppIndexPatternContext(series.dataType);

  const { reportDefinitions: selectedReportDefinitions = {} } = series;

  const { labels, baseFilters, definitionFields } = seriesConfig;

  const queryFilters = useMemo(() => {
    const filtersN: ESFilter[] = [];
    (baseFilters ?? []).forEach((qFilter: PersistableFilter | ExistsFilter) => {
      if (qFilter.query) {
        filtersN.push(qFilter.query);
      }
      const existFilter = qFilter as ExistsFilter;
      if (existFilter.exists) {
        filtersN.push({ exists: existFilter.exists });
      }
    });

    if (!isEmpty(selectedReportDefinitions)) {
      definitionFields.forEach((fieldT) => {
        if (indexPattern && selectedReportDefinitions?.[fieldT] && fieldT !== field) {
          const values = selectedReportDefinitions?.[fieldT];
          if (!values.includes(ALL_VALUES_SELECTED)) {
            const valueFilter = buildPhrasesFilter(fieldT, values, indexPattern)[0];
            filtersN.push(valueFilter.query);
          }
        }
      });
    }

    return filtersN;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedReportDefinitions), JSON.stringify(baseFilters)]);

  return (
    <EuiFlexGroup justifyContent="flexStart" gutterSize="s" alignItems="center" wrap>
      <EuiFlexItem>
        {indexPattern && (
          <FieldValueSuggestions
            label={labels[field]}
            sourceField={field}
            indexPatternTitle={indexPattern.title}
            selectedValue={selectedReportDefinitions?.[field]}
            onChange={(val?: string[]) => onChange(field, val)}
            filters={queryFilters}
            time={series.time}
            fullWidth={true}
            allowAllValuesSelection={true}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
