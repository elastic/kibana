/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '../../../../types';

export function prepareInputPackagePolicyDataset(newPolicy: NewPackagePolicy): {
  policy: NewPackagePolicy;
  forceCreateNeeded: boolean;
} {
  let forceCreateNeeded = false;
  const { inputs } = newPolicy;

  if (!inputs || !inputs.length) {
    return { policy: newPolicy, forceCreateNeeded: false };
  }

  const newInputs = inputs.map((input) => {
    const { streams } = input;
    if (!streams) {
      return input;
    }

    const newStreams = streams.map((stream) => {
      if (
        !stream.vars ||
        !stream.vars['data_stream.dataset'] ||
        !stream.vars['data_stream.dataset'].value?.package
      ) {
        return stream;
      }

      const datasetVar = stream.vars['data_stream.dataset'];

      forceCreateNeeded = datasetVar.value?.package !== newPolicy?.package?.name;
      stream.vars['data_stream.dataset'] = {
        ...datasetVar,
        value: datasetVar.value?.dataset,
      };

      return stream;
    });

    return {
      ...input,
      streams: newStreams,
    };
  });

  return {
    policy: {
      ...newPolicy,
      inputs: newInputs,
    },
    forceCreateNeeded,
  };
}
