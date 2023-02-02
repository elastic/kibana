/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SimpleSavedObjectImpl } from './legacy_saved_object';
import { MapGetOut } from './types';

/**
 * Serializer to convert the response from the Saved object get() method (server)
 * to the legacy SO get() client side.
 *
 * @param soResult Result from the RPC "get" call
 * @returns The serialized result
 */
export const postGet = (soResult: any): MapGetOut => {
  const simpleSavedObject = new SimpleSavedObjectImpl(soResult.saved_object);
  return {
    saved_object: simpleSavedObject,
    outcome: soResult.outcome,
    alias_target_id: soResult.alias_target_id,
    alias_purpose: soResult.alias_purpose,
  };
};
