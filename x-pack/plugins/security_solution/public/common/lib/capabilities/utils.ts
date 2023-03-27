/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isArray } from 'lodash';
import type { Capabilities } from '@kbn/core/public';
import type { Features } from './types';

/**
 * The format of defining features supports OR and AND mechanism. To specify features in an OR fashion
 * they can be defined in a single level array like: [requiredFeature1, requiredFeature2]. If either of these features
 * is satisfied the links would be included. To require that the features be AND'd together a second level array
 * can be specified: [feature1, [feature2, feature3]] this would result in feature1 || (feature2 && feature3).
 *
 * The final format is to specify a single feature, this would be like: features: feature1, which is the same as
 * features: [feature1]
 */

export const hasCapabilities = (capabilities: Capabilities, features?: Features): boolean => {
  if (!features) {
    return true;
  }
  if (!isArray(features)) {
    return !!get(capabilities, features, false);
  } else {
    return features.some((linkCapabilityKeyOr) => {
      if (isArray(linkCapabilityKeyOr)) {
        return linkCapabilityKeyOr.every((linkCapabilityKeyAnd) =>
          get(capabilities, linkCapabilityKeyAnd, false)
        );
      }
      return get(capabilities, linkCapabilityKeyOr, false);
    });
  }
};
