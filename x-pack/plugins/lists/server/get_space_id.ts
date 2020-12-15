/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';

import { SpacesServiceStart } from '../../spaces/server';

export const getSpaceId = ({
  spaces,
  request,
}: {
  spaces: SpacesServiceStart | undefined | null;
  request: KibanaRequest;
}): string => spaces?.getSpaceId(request) ?? 'default';
