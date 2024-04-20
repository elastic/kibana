/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { Redirect } from 'react-router-dom';

import { SECTION_SLUG } from './constants';

export const RedirectToTransformManagement = () => <Redirect to={`/${SECTION_SLUG.HOME}`} />;

export const RedirectToCreateTransform = (
 {
  savedObjectId
 }: {
  savedObjectId: string;
 }
) => (<Redirect push to={`/${SECTION_SLUG.CREATE_TRANSFORM}/${savedObjectId}`} />);
