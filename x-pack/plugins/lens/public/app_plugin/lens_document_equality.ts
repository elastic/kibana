/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, intersection, union } from 'lodash';
import { FilterManager } from '@kbn/data-plugin/public';
import { Document } from '../persistence/saved_object_store';
import { DatasourceMap } from '../types';
import { removePinnedFilters } from './save_modal_container';

const removeNonSerializable = (obj: Parameters<JSON['stringify']>[0]) =>
  JSON.parse(JSON.stringify(obj));

export const isLensEqual = (
  doc1In: Document | undefined,
  doc2In: Document | undefined,
  injectFilterReferences: FilterManager['inject'],
  datasourceMap: DatasourceMap,
  compareFilters = true
) => {
  if (doc1In === undefined || doc2In === undefined) {
    return doc1In === doc2In;
  }

  // we do this so that undefined props are the same as non-existant props
  const doc1 = removeNonSerializable(doc1In);
  const doc2 = removeNonSerializable(doc2In);

  if (doc1?.visualizationType !== doc2?.visualizationType) {
    return false;
  }

  if (!isEqual(doc1.state.query, doc2.state.query)) {
    return false;
  }

  if (!isEqual(doc1.state.visualization, doc2.state.visualization)) {
    return false;
  }

  // data source equality
  const availableDatasourceTypes1 = Object.keys(doc1.state.datasourceStates);
  const availableDatasourceTypes2 = Object.keys(doc2.state.datasourceStates);

  let datasourcesEqual =
    intersection(availableDatasourceTypes1, availableDatasourceTypes2).length ===
    union(availableDatasourceTypes1, availableDatasourceTypes2).length;

  if (datasourcesEqual) {
    // equal so far, so actually check
    datasourcesEqual = availableDatasourceTypes1
      .map((type) =>
        datasourceMap[type].isEqual(
          doc1.state.datasourceStates[type],
          doc1.references,
          doc2.state.datasourceStates[type],
          doc2.references
        )
      )
      .every((res) => res);
  }

  if (!datasourcesEqual) {
    return false;
  }

  if (compareFilters) {
    return areFiltersEqual(doc1In, doc2In, injectFilterReferences);
  }

  return true;
};

export const areFiltersEqual = (
  doc1In: Document | undefined,
  doc2In: Document | undefined,
  injectFilterReferences: FilterManager['inject']
) => {
  if (doc1In === undefined || doc2In === undefined) {
    return doc1In === doc2In;
  }

  // we do this so that undefined props are the same as non-existant props
  const doc1 = removeNonSerializable(doc1In);
  const doc2 = removeNonSerializable(doc2In);
  const [filtersInjected1, filtersInjected2] = [doc1, doc2].map((doc) =>
    removePinnedFilters(injectDocFilterReferences(injectFilterReferences, doc))
  );
  return isEqual(filtersInjected1?.state.filters, filtersInjected2?.state.filters);
};

function injectDocFilterReferences(
  injectFilterReferences: FilterManager['inject'],
  doc?: Document
) {
  if (!doc) return undefined;
  return {
    ...doc,
    state: {
      ...doc.state,
      filters: injectFilterReferences(doc.state?.filters || [], doc.references),
    },
  };
}
