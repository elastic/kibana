/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import * as i18n from './translations';

export function ReadyForUpgradeBadge(): JSX.Element {
  return <EuiBadge color="success">{i18n.READY_FOR_UPDATE}</EuiBadge>;
}
