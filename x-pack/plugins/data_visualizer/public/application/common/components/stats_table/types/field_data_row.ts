/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewField } from '@kbn/data-views-plugin/public';
import {
  FieldVisConfig,
  FileBasedFieldVisConfig,
} from '../../../../../../common/types/field_vis_config';

export interface FieldDataRowProps {
  config: FieldVisConfig | FileBasedFieldVisConfig;
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}
