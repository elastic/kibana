/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSideNav } from '@elastic/eui';
import React from 'react';
import type { Observable } from 'rxjs';
import type { NavigationSection } from '../../../services/navigation_registry';

export function ObservabilitySideNav({}: {
  navigationSections$: Observable<NavigationSection[]>;
}): React.ReactElement | null {
  return <EuiSideNav />;
}
