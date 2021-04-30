/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty } from 'lodash';
import FieldValueSuggestions from '../../../field_value_suggestions';
import { useUrlStorage } from '../../hooks/use_url_storage';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';
import { ESFilter } from '../../../../../../../../../typings/elasticsearch';
import { PersistableFilter } from '../../../../../../../lens/common';
import { ExistsFilter } from '../../../../../../../../../src/plugins/data/common/es_query/filters';
import { buildPhrasesFilter } from '../../configurations/utils';
import { DataSeries } from '../../types';

interface Props {
  seriesId: string;
  field: string;
  dataSeries: DataSeries;
  onChange: (field: string, value?: string[]) => void;
}

export function ReportDefinitionField({ seriesId, field, dataSeries, onChange }: Props) {
  const { series } = useUrlStorage(seriesId);

  const { indexPattern } = useAppIndexPatternContext();

  const { reportDefinitions: selectedReportDefinitions = {} } = series;

  const { labels, filters, reportDefinitions } = dataSeries;

  const queryFilters = useMemo(() => {
    const filtersN: ESFilter[] = [];
    (filters ?? []).forEach((qFilter: PersistableFilter | ExistsFilter) => {
      if (qFilter.query) {
        filtersN.push(qFilter.query);
      }
      const existFilter = qFilter as ExistsFilter;
      if (existFilter.exists) {
        filtersN.push({ exists: existFilter.exists });
      }
    });

    if (!isEmpty(selectedReportDefinitions)) {
      reportDefinitions.forEach(({ field: fieldT, custom }) => {
        if (!custom && selectedReportDefinitions?.[fieldT] && fieldT !== field) {
          const values = selectedReportDefinitions?.[fieldT];
          const valueFilter = buildPhrasesFilter(fieldT, values, indexPattern)[0];
          filtersN.push(valueFilter.query);
        }
      });
    }

    return filtersN;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedReportDefinitions), JSON.stringify(filters)]);

  return (
    <EuiFlexGroup justifyContent="flexStart" gutterSize="s" alignItems="center" wrap>
      <EuiFlexItem>
        <FieldValueSuggestions
          label={labels[field]}
          sourceField={field}
          indexPattern={indexPattern}
          selectedValue={selectedReportDefinitions?.[field]}
          onChange={(val?: string[]) => onChange(field, val)}
          filters={queryFilters}
          time={series.time}
          fullWidth={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
