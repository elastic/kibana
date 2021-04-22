/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AlertAddProps } from '../application/sections/alert_form/alert_add';
import { AlertAdd } from '../application/sections/alert_form';

export const getAddAlertFlyoutLazy = (props: AlertAddProps) => {
  return <AlertAdd {...props} />;
};
