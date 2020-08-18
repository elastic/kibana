/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useShallowEqualSelector } from '../../common/hooks/use_shallow_equal_selector';
import * as selectors from '../store/selectors';

/**
 * Get the query string keys used by this Resolver instance.
 */
export const useQueryStringKeys = (): { idKey: string; eventKey: string } => {
  const resolverComponentInstanceID = useShallowEqualSelector(
    selectors.resolverComponentInstanceID
  );
  const idKey: string = `resolver-${resolverComponentInstanceID}-id`;
  const eventKey: string = `resolver-${resolverComponentInstanceID}-event`;
  return {
    idKey,
    eventKey,
  };
};
