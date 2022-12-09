/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { Navigate } from 'react-router-dom';

import { SECTION_SLUG } from '../constants';

export const RedirectToTransformManagement: FC = () => <Navigate to={`/${SECTION_SLUG.HOME}`} />;

export const RedirectToCreateTransform: FC<{ savedObjectId: string }> = ({ savedObjectId }) => (
  <Navigate push to={`/${SECTION_SLUG.CREATE_TRANSFORM}/${savedObjectId}`} />
);
