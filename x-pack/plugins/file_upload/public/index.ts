/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110898
/* eslint-disable @kbn/eslint/no_export_all */

import { FileUploadPlugin } from './plugin';

export function plugin() {
  return new FileUploadPlugin();
}

export * from './importer/types';

export type { Props as IndexNameFormProps } from './components/geojson_upload_form/index_name_form';

export type { FileUploadPluginStart } from './plugin';
export type { FileUploadComponentProps, FileUploadGeoResults } from './lazy_load_bundle';
