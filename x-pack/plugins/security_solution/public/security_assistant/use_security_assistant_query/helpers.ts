/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '../../../common/search_strategy';

interface QueryField {
  field: string;
  values: string;
}

export const getQueryFields = (data: TimelineEventsDetailsItem[]): QueryField[] => [
  ...data
    ?.filter((x) => x.field === 'kibana.alert.rule.description')
    ?.map((x) => ({
      field: 'kibana.alert.rule.description',
      values: x.values?.join(',\n') ?? '',
    })),
  ...data
    ?.filter((x) => x.field === 'event.category')
    ?.map((x) => ({ field: 'event.category', values: x.values?.join(',\n') ?? '' })),
  ...data
    ?.filter((x) => x.field === 'event.action')
    ?.map((x) => ({ field: 'event.action', values: x.values?.join(',\n') ?? '' })),
  ...data
    ?.filter((x) => x.field === 'host.name')
    ?.map((x) => ({ field: 'host.name', values: x.values?.join(',\n') ?? '' })),
  ...data
    ?.filter((x) => x.field === 'kibana.alert.reason')
    ?.map((x) => ({ field: 'kibana.alert.reason', values: x.values?.join(',\n') ?? '' })),
  ...data
    ?.filter((x) => x.field === 'destination.ip')
    ?.map((x) => ({ field: 'destination.ip', values: x.values?.join(',\n') ?? '' })),
  ...data
    ?.filter((x) => x.field === 'user.name')
    ?.map((x) => ({ field: 'user.name', values: x.values?.join(',\n') ?? '' })),
];

export const getFieldsAsCsv = (queryFields: QueryField[]): string =>
  queryFields.map(({ field, values }) => `${field},${values}`).join('\n');

export const getDefaultQuery = (
  context: string
) => `You are a helpful, expert ai assistant who answers questions about Elastic Security. You have the personality of a mutant superhero who says "bub" a lot.
Given the following context containing the most relevant fields from an alert or event:


CONTEXT:
"""
${context}
"""


Explain the meaning from the context above, then summarize a list of suggested Elasticsearch KQL and EQL queries. Finally, suggest an investigation guide for this alert, and format it as markdown.`;

export async function getQueryFromEventDetails({
  data,
}: {
  data: TimelineEventsDetailsItem[];
}): Promise<string> {
  const queryFields = getQueryFields(data);
  const fieldsCsv = getFieldsAsCsv(queryFields);
  const query = getDefaultQuery(fieldsCsv);

  return query;
}
