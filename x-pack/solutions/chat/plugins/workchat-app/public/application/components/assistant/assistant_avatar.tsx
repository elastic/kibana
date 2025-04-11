/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiAvatarProps } from '@elastic/eui';

type AssistantAvatarProps = EuiAvatarProps & {
  customText?: string;
};

export const AssistantAvatar = ({ customText, name, ...props }: AssistantAvatarProps) => {
  return <EuiAvatar initials={customText} name={name} {...props} />;
};
