/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { sortBy } from 'lodash';
import type { TransformListRow } from '../../../../common';

// For transforms, some might be part of a integration package
// A transform might be dependent on the results of another transform
// If transforms have _meta.order specified, install sequentially (sort by package and install order)
export const sortTransformsToReauthorize = (transforms: TransformListRow[]) => {
  let shouldInstallSequentially = false;
  const mappedTransforms = transforms.map((t) => {
    let packageName = '';
    let order = Number.MIN_VALUE;
    if (isPopulatedObject<string, object>(t?.config?._meta, ['order'])) {
      if (typeof t.config._meta.order === 'number') {
        shouldInstallSequentially = true;
        order = t?.config?._meta.order;
      }
      if (
        isPopulatedObject(t.config._meta.package, ['name']) &&
        typeof t.config._meta.package.name === 'string'
      ) {
        packageName = t.config._meta.package.name;
      }
    }

    return { id: t.id, order, packageName };
  });

  return {
    transformIds: shouldInstallSequentially
      ? sortBy(mappedTransforms, ['packageName', 'order']).map((t) => ({ id: t.id }))
      : mappedTransforms.map((t) => ({ id: t.id })),
    shouldInstallSequentially,
  };
};
