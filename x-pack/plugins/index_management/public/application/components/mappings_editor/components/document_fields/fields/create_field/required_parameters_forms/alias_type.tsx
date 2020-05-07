/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { PathParameter } from '../../../field_parameters';
import { ComponentProps } from './index';

export const AliasTypeRequiredParameters = ({ allFields }: ComponentProps) => {
  return <PathParameter allFields={allFields} />;
};
