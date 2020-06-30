/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';

export const useKibanaSpaceId = (): string => {
  const kibana = useKibana();
  // NOTE: The injectedMetadata service will be deprecated at some point. We should migrate
  // this to the client side Spaces plugin when it becomes available.
  const activeSpace = kibana.services.injectedMetadata?.getInjectedVar('activeSpace');

  return pipe(
    activeSpaceRT.decode(activeSpace),
    fold(
      () => 'default',
      (decodedActiveSpace) => decodedActiveSpace.space.id
    )
  );
};

const activeSpaceRT = rt.type({
  space: rt.type({
    id: rt.string,
  }),
});
