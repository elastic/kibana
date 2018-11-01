/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

interface SelectionCountProps {
  selectionCount: number;
}

export const SelectionCount = (props: SelectionCountProps) => (
  <div>
    {props.selectionCount} {`item${props.selectionCount === 1 ? '' : 's'}`} selected
  </div>
);
