/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const ScriptSourceCodec = t.interface({
  is_generated_script: t.boolean,
  file_name: t.string,
});

export const MetadataCodec = t.partial({
  is_tls_enabled: t.boolean,
  is_zip_url_tls_enabled: t.boolean,
  script_source: ScriptSourceCodec,
});

export type Metadata = t.TypeOf<typeof MetadataCodec>;
