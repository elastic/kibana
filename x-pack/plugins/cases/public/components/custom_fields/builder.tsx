/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomFieldBuilderMap } from './types';
import { createTextAreaCustomFieldBuilder } from './text_area_field';
import { createTextCustomFieldBuilder } from './text_field';
import { createListCustomFieldBuilder } from './list_field';
import { createNumberCustomFieldBuilder } from './number_field';
import { createUrlCustomFieldBuilder } from './url_field';

export const builderMap: CustomFieldBuilderMap = {
  Text: createTextCustomFieldBuilder,
  Textarea: createTextAreaCustomFieldBuilder,
  List: createListCustomFieldBuilder,
  Url: createUrlCustomFieldBuilder,
  Number: createNumberCustomFieldBuilder,
};
