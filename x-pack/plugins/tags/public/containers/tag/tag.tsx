/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export interface TagProps {
  id: string;
}

export const Tag: React.FC<TagProps> = ({ id }) => {
  return <div>this is tag</div>;
};
