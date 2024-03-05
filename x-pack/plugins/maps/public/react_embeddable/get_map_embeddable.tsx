/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { RegisterReactEmbeddable } from '@kbn/embeddable-plugin/public';
import type { MapEmbeddableInput } from '../embeddable/types';

export async function getMapEmbeddable(state: MapEmbeddableInput, maybeId?: string) {
  return RegisterReactEmbeddable((apiRef) => {
    return <div>hello world</div>;
  });
}