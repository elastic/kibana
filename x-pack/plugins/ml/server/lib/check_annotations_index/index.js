/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithInternalUserFactory } from '../../client/call_with_internal_user_factory';

import {
  ML_ANNOTATIONS_INDEX_ALIAS_READ,
  ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
  ML_ANNOTATIONS_INDEX_PATTERN
} from '../../../common/constants/index_patterns';

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

    const annotationsReadAliasExists = await callWithInternalUser('indices.existsAlias', {
      name: ML_ANNOTATIONS_INDEX_ALIAS_READ
    });

    if (annotationsReadAliasExists) {
      server.log(['ML', 'info'], `Deleting alias ${ML_ANNOTATIONS_INDEX_ALIAS_READ}`);
      await callWithInternalUser('indices.deleteAlias', {
        index: '_all',
        name: ML_ANNOTATIONS_INDEX_ALIAS_READ
      });
    }

    const annotationsWriteAliasExists = await callWithInternalUser('indices.existsAlias', {
      name: ML_ANNOTATIONS_INDEX_ALIAS_WRITE
    });

    if (annotationsWriteAliasExists) {
      server.log(['ML', 'info'], `Deleting alias ${ML_ANNOTATIONS_INDEX_ALIAS_WRITE}`);
      await callWithInternalUser('indices.deleteAlias', {
        index: '_all',
        name: ML_ANNOTATIONS_INDEX_ALIAS_WRITE
      });
    }

    server.log(['ML', 'info'], `Pointing alias ${ML_ANNOTATIONS_INDEX_ALIAS_READ} to ${ML_ANNOTATIONS_INDEX_PATTERN}`);
    const readAliasCreationParams = { name: ML_ANNOTATIONS_INDEX_ALIAS_READ, index: ML_ANNOTATIONS_INDEX_PATTERN };
    const annotationsReadAliasCreated = await callWithInternalUser('indices.putAlias', readAliasCreationParams);

    if (!annotationsReadAliasCreated) {
      throw new Error(`Creating alias ${ML_ANNOTATIONS_INDEX_ALIAS_READ} failed.`);
    }

    server.log(['ML', 'info'], `Pointing alias ${ML_ANNOTATIONS_INDEX_ALIAS_WRITE} to ${ML_ANNOTATIONS_INDEX_PATTERN}`);
    const writeAliasCreationParams = { name: ML_ANNOTATIONS_INDEX_ALIAS_WRITE, index: ML_ANNOTATIONS_INDEX_PATTERN };
    const annotationsWriteAliasCreated = await callWithInternalUser('indices.putAlias', writeAliasCreationParams);

    if (!annotationsWriteAliasCreated) {
      throw new Error(`Creating alias ${ML_ANNOTATIONS_INDEX_ALIAS_WRITE} failed.`);
    }
  }
}
