/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Space } from '../../common';

/**
 * Values used in the "Customize Space" form
 */
export interface CustomizeSpaceFormValues extends Partial<Space> {
  customIdentifier?: boolean;
  avatarType?: 'initials' | 'image';
  customAvatarInitials?: boolean;
  customAvatarColor?: boolean;
}
