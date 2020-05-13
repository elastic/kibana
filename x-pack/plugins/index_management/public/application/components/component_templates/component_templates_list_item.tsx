/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { ComponentTemplateDeserialized } from '../../../../common';

interface Props {
  component: ComponentTemplateDeserialized;
}

export const ComponentTemplatesListItem = ({ component }: Props) => {
  return <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>{component.name}</div>;
};
