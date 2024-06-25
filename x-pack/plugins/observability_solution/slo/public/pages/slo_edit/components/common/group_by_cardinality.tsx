/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, QuerySchema } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useFetchGroupByCardinality } from '../../../../hooks/use_fetch_group_by_cardinality';
import { CreateSLOForm } from '../../types';
import { getGroupKeysProse } from '../../../../utils/slo/groupings';

export function GroupByCardinality({
  titleAppend,
  customFilters,
}: {
  titleAppend?: React.ReactNode;
  customFilters?: QuerySchema;
}) {
  const { watch } = useFormContext<CreateSLOForm>();

  const index = watch('indicator.params.index');
  const filters = watch('indicator.params.filter');
  const timestampField = watch('indicator.params.timestampField');
  const groupByField = watch('groupBy');

  const { isLoading: isGroupByCardinalityLoading, data: groupByCardinality } =
    useFetchGroupByCardinality(index, timestampField, groupByField, customFilters || filters);
  const groupBy = [groupByField].flat().filter((value) => !!value);
  const hasGroupBy = !groupBy.includes(ALL_VALUE) && groupBy.length;

  if (!hasGroupBy) {
    return null;
  }

  if (isGroupByCardinalityLoading && !groupByCardinality) {
    return <EuiCallOut size="s" title={<EuiLoadingSpinner />} />;
  }

  if (!groupByCardinality) {
    return null;
  }

  const cardinalityMessage = i18n.translate('xpack.slo.sloEdit.groupBy.cardinalityInfo', {
    defaultMessage:
      'Selected group by field {groupBy} will generate at least {card} SLO instances based on the last 24h sample data.',
    values: {
      card: groupByCardinality.cardinality,
      groupBy: getGroupKeysProse(groupByField),
    },
  });

  return (
    <EuiCallOut
      size="s"
      iconType={groupByCardinality.isHighCardinality ? 'warning' : ''}
      color={groupByCardinality.isHighCardinality ? 'warning' : 'primary'}
      title={
        titleAppend ? (
          <>
            {titleAppend} {cardinalityMessage}
          </>
        ) : (
          cardinalityMessage
        )
      }
    />
  );
}
