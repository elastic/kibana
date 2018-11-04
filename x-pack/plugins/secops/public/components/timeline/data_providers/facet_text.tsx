/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';

interface Props {
  text: string;
}

/**
 * Renders text formatted as a Facet count. The text being rendered is
 * typically a numeric value, but non-numeric values can also be rendered.
 */
export const FacetText = pure<Props>(({ text }) => (
  <EuiBadge color="primary">
    <span data-test-subj="facetText">{text}</span>
  </EuiBadge>
));
