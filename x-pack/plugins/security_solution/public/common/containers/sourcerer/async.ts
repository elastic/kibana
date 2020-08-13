/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */
/* eslint-disable no-restricted-imports */
import { get, isEmpty } from 'lodash/fp';
import {
  baseCategoryFields,
  getDocumentation,
  getIndexAlias,
  hasDocumentation,
  IndexAlias,
} from '../../../../server/utils/beat_schema';
import { IndexFieldDescriptor } from '../../../../server/lib/index_fields/types';
import { IndexField } from '../../../../server/graphql/types';
import { IndexPatternsContract } from '../../../../../../../src/plugins/data/common/index_patterns/index_patterns';

interface GetIndexFields {
  indexPatternsService: IndexPatternsContract;
  selectedPatterns: string[];
}
export const fetchIndexFields = async ({
  indexPatternsService,
  selectedPatterns,
}: GetIndexFields) => {
  const indexesAliasIndices = selectedPatterns.reduce<Record<string, string[]>>(
    (accumulator, indexTitle) => {
      const key = getIndexAlias(selectedPatterns, indexTitle);

      if (get(key, accumulator)) {
        accumulator[key] = [...accumulator[key], indexTitle];
      } else {
        accumulator[key] = [indexTitle];
      }
      return accumulator;
    },
    {}
  );

  const fieldsPromiseArray = Object.values(indexesAliasIndices).map((indicesByGroup) =>
    indicesByGroup.map((eachIndex) =>
      indexPatternsService.getFieldsForWildcard({
        pattern: eachIndex,
      })
    )
  );
  const fieldsPromiseCalls = await Promise.all(
    fieldsPromiseArray.map((innerPromiseArray) => {
      return Promise.all(innerPromiseArray);
    })
  );
  const responsesIndexFields: IndexFieldDescriptor[][] = fieldsPromiseCalls.map((group) =>
    group.reduce((acc, p) => [...acc, ...p], [])
  );
  return formatIndexFields(responsesIndexFields, Object.keys(indexesAliasIndices) as IndexAlias[]);
};

export const fetchIndiciesExist = async ({
  indexPatternsService,
  selectedPatterns,
}: GetIndexFields) => {};

const missingFields = [
  {
    name: '_id',
    type: 'string',
    searchable: true,
    aggregatable: false,
    readFromDocValues: true,
  },
  {
    name: '_index',
    type: 'string',
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
];

export const formatIndexFields = (
  responsesIndexFields: IndexFieldDescriptor[][],
  indexesAlias: IndexAlias[]
): IndexField[] =>
  responsesIndexFields
    .reduce(
      (accumulator: IndexField[], indexFields: IndexFieldDescriptor[], indexesAliasIdx: number) => [
        ...accumulator,
        ...[...missingFields, ...indexFields].reduce(
          (itemAccumulator: IndexField[], index: IndexFieldDescriptor) => {
            const alias: IndexAlias = indexesAlias[indexesAliasIdx];
            const splitName = index.name.split('.');
            const category = baseCategoryFields.includes(splitName[0]) ? 'base' : splitName[0];
            return [
              ...itemAccumulator,
              {
                ...(hasDocumentation(alias, index.name) ? getDocumentation(alias, index.name) : {}),
                ...index,
                category,
                indexes: [alias],
              } as IndexField,
            ];
          },
          []
        ),
      ],
      []
    )
    .reduce((accumulator: IndexField[], indexfield: IndexField) => {
      const alreadyExistingIndexField = accumulator.findIndex(
        (acc) => acc.name === indexfield.name
      );
      if (alreadyExistingIndexField > -1) {
        const existingIndexField = accumulator[alreadyExistingIndexField];
        return [
          ...accumulator.slice(0, alreadyExistingIndexField),
          {
            ...existingIndexField,
            description: isEmpty(existingIndexField.description)
              ? indexfield.description
              : existingIndexField.description,
            indexes: Array.from(new Set([...existingIndexField.indexes, ...indexfield.indexes])),
          },
          ...accumulator.slice(alreadyExistingIndexField + 1),
        ];
      }
      return [...accumulator, indexfield];
    }, []);
