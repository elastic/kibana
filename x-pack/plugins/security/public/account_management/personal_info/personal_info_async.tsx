/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Props } from './personal_info';

export const getPersonalInfoComponent = async (): Promise<React.FC<Props>> => {
  const { PersonalInfo } = await import('./personal_info');
  return (props: Props) => {
    return <PersonalInfo {...props} />;
  };
};
