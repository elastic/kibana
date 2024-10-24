/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataViewSelector } from '../../../../../../../rule_creation_ui/components/data_view_selector';
import type { FieldHook } from '../../../../../../../../shared_imports';

interface DataViewFieldProps {
  field: FieldHook<string | undefined>;
}

export function DataViewField({ field }: DataViewFieldProps): JSX.Element {
  return <DataViewSelector field={field} />;
}
