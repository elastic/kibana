/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
import { FacetText } from './facet_text';

/**
 * Prompts the user to drop anything with a facet count into the data providers section.
 */
export const Empty = pure(() => (
  <div
    data-test-subj="empty"
    style={{
      alignItems: 'center',
      color: '#999999',
      display: 'flex',
      justifyContent: 'center',
    }}
  >
    Drop anything with a <FacetText text="Facet" /> count here
  </div>
));
