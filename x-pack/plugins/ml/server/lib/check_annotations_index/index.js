/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithInternalUserFactory } from '../../client/call_with_internal_user_factory';

import { ML_ANNOTATIONS_INDEX_ALIAS, ML_ANNOTATIONS_INDEX_PATTERN } from '../../../common/constants/index_patterns';

export async function checkAnnotationsIndex(server) {
  const callWithInternalUser = callWithInternalUserFactory(server);

  const indexParams = { index: ML_ANNOTATIONS_INDEX_PATTERN };

  const annotationsIndexExists = await callWithInternalUser('indices.exists', indexParams);

  if (!annotationsIndexExists) {
    server.log(['ML', 'info'], `Creating index ${ML_ANNOTATIONS_INDEX_PATTERN}`);

    const annotationsIndexCreated = await callWithInternalUser('indices.create', indexParams);

    if (!annotationsIndexCreated.acknowledged) {
      throw new Error(`Creating index ${ML_ANNOTATIONS_INDEX_PATTERN} failed.`);
    }

    const annotationsAliasExists = await callWithInternalUser('indices.existsAlias', {
      name: ML_ANNOTATIONS_INDEX_ALIAS
    });

    if (annotationsAliasExists) {
      server.log(['ML', 'info'], `Deleting alias ${ML_ANNOTATIONS_INDEX_ALIAS}`);
      await callWithInternalUser('indices.deleteAlias', {
        index: '_all',
        name: ML_ANNOTATIONS_INDEX_ALIAS
      });
    }

    server.log(['ML', 'info'], `Pointing alias ${ML_ANNOTATIONS_INDEX_ALIAS} to ${ML_ANNOTATIONS_INDEX_PATTERN}`);
    const aliasCreationParams = { name: ML_ANNOTATIONS_INDEX_ALIAS, index: ML_ANNOTATIONS_INDEX_PATTERN };
    const annotationsAliasCreated = await callWithInternalUser('indices.putAlias', aliasCreationParams);

    if (!annotationsAliasCreated) {
      throw new Error(`Creating alias ${ML_ANNOTATIONS_INDEX_ALIAS} failed.`);
    }
  }
}
