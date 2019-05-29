/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MetadataTable } from '..';
import { ERROR_METADATA_SECTIONS } from './sections';
import { APMError } from '../../../../../typings/es_schemas/ui/APMError';

interface Props {
  error: APMError;
}

export function ErrorMetadata({ error }: Props) {
  return <MetadataTable item={error} sections={ERROR_METADATA_SECTIONS} />;
}
