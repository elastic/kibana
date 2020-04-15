/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';

import { SpacesServiceSetup } from '../../../spaces/server';
import { getSpace } from '../utils/get_space';

export const getListIndex = ({
  spaces,
  request,
  listsIndexName,
}: {
  spaces: SpacesServiceSetup | undefined | null;
  request: KibanaRequest;
  listsIndexName: string;
}): string => {
  return `${listsIndexName}-${getSpace({ request, spaces })}`;
};
