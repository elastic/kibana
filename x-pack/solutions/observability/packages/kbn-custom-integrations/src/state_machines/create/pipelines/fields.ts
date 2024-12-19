/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { replaceSpecialChars } from '../../../components/create/utils';
import { CreateCustomIntegrationContext, UpdateFieldsEvent, WithTouchedFields } from '../types';

type ValuesTuple = [CreateCustomIntegrationContext, UpdateFieldsEvent];

// Pipeline for updating the fields and touchedFields properties within context
export const executeFieldsPipeline = (
  context: CreateCustomIntegrationContext,
  event: UpdateFieldsEvent
) => {
  return pipe(
    [context, event] as ValuesTuple,
    updateFields(context),
    updateTouchedFields(context),
    maybeMatchDatasetNameToIntegrationName(context),
    replaceSpecialCharacters(context)
  );
};

const updateFields =
  (originalContext: CreateCustomIntegrationContext) =>
  (values: ValuesTuple): ValuesTuple => {
    const [context, event] = values;

    const mergedContext = {
      ...context,
      fields: {
        ...context.fields,
        ...event.fields,
      },
    };
    return [mergedContext, event];
  };

const updateTouchedFields =
  (originalContext: CreateCustomIntegrationContext) =>
  (values: ValuesTuple): ValuesTuple => {
    const [context, event] = values;

    const mergedContext = {
      ...context,
      touchedFields: {
        ...context.touchedFields,
        ...Object.keys(event.fields).reduce<WithTouchedFields['touchedFields']>(
          (acc, field) => ({ ...acc, [field]: true }),
          {} as WithTouchedFields['touchedFields']
        ),
      },
    };
    return [mergedContext, event];
  };

const maybeMatchDatasetNameToIntegrationName =
  (originalContext: CreateCustomIntegrationContext) =>
  (values: ValuesTuple): ValuesTuple => {
    const [context, event] = values;
    if (context.touchedFields.integrationName && !context.touchedFields.datasets) {
      return [
        {
          ...context,
          fields: {
            ...context.fields,
            datasets: context.fields.datasets.map((dataset, index) => ({
              ...dataset,
              name: index === 0 ? context.fields.integrationName : dataset.name,
            })),
          },
        },
        event,
      ];
    } else {
      return [context, event];
    }
  };

const replaceSpecialCharacters =
  (originalContext: CreateCustomIntegrationContext) =>
  (values: ValuesTuple): ValuesTuple => {
    const [context, event] = values;

    const mergedContext = {
      ...context,
      fields: {
        ...context.fields,
        integrationName: replaceSpecialChars(context.fields.integrationName),
        datasets: context.fields.datasets.map((dataset) => ({
          ...dataset,
          name: replaceSpecialChars(dataset.name),
        })),
      },
    };

    return [mergedContext, event];
  };

export const getDatasetNamePrefix = (integrationName: string) => `${integrationName}.`;
export const datasetNameIsPrefixed = (datasetName: string, integrationName: string) =>
  datasetName.startsWith(getDatasetNamePrefix(integrationName));
export const datasetNameWillBePrefixed = (datasetName: string, integrationName: string) =>
  datasetName !== integrationName;
export const prefixDatasetName = (datasetName: string, integrationName: string) =>
  `${getDatasetNamePrefix(integrationName)}${datasetName}`;

// The content after the integration name prefix.
export const getDatasetNameWithoutPrefix = (datasetName: string, integrationName: string) =>
  datasetNameIsPrefixed(datasetName, integrationName)
    ? datasetName.split(getDatasetNamePrefix(integrationName))[1]
    : datasetName;

// The machine holds unprefixed names internally to dramatically reduce complexity and improve performance for input changes in the UI.
// Prefixed names are used at the outermost edges e.g. when providing initial state and submitting to the API.
export const normalizeDatasetNames = (fields: UpdateFieldsEvent['fields']) => {
  const value = {
    ...fields,
    ...(fields.datasets !== undefined && fields.integrationName !== undefined
      ? {
          datasets: fields.datasets.map((dataset) => ({
            ...dataset,
            name: getDatasetNameWithoutPrefix(dataset.name, fields.integrationName!),
          })),
        }
      : {}),
  };
  return value;
};
