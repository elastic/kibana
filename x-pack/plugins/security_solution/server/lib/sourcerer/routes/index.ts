/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  transformError,
  getIndexExists,
  getPolicyExists,
  setPolicy,
  setTemplate,
  createBootstrapIndex,
} from '@kbn/securitysolution-es-utils';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import {
  DEFAULT_INDEX_PATTERN_ID,
  DEFAULT_TIME_FIELD,
  SOURCERER_API_URL,
} from '../../../../common/constants';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import { IndexPatternsServiceStart } from '../../../../../../../src/plugins/data/server/index_patterns';
import { KibanaIndexPattern } from '../../../../public/common/store/sourcerer/model';
import { IndexPatternsService } from '../../../../../../../src/plugins/data/common';

const getKibanaIndexPattern = async (
  indexPatternsService: IndexPatternsService,
  defaultIndicesName: string[]
): Promise<KibanaIndexPattern> => {
  let indexPattern: KibanaIndexPattern;
  console.log('getKibanaIndexPattern');
  try {
    console.log('try');
    indexPattern = (await indexPatternsService.get(DEFAULT_INDEX_PATTERN_ID)) as KibanaIndexPattern; // types are messy here, this is cleanest see property on IndexPatternsService.savedObjectsCache
  } catch (e) {
    console.log('ERR', e);
    indexPattern = (await indexPatternsService.createAndSave({
      id: DEFAULT_INDEX_PATTERN_ID,
      title: defaultIndicesName.join(','),
      timeFieldName: DEFAULT_TIME_FIELD,
    })) as KibanaIndexPattern; // types are messy here ^^
    console.log('indexPattern', indexPattern);
  }
  return indexPattern;
};

export const createSourcererIndexPatternRoute = (
  router: SecuritySolutionPluginRouter,
  indexPatterns: IndexPatternsServiceStart
) => {
  router.post(
    {
      path: SOURCERER_API_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      console.log('EHYO', request);
      const siemResponse = buildSiemResponse(response);

      try {
        const siemClient = context.securitySolution?.getAppClient();
        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        await createSourcererIndexPattern(context, indexPatterns);
        return response.ok({ body: { acknowledged: true } });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
export const createSourcererIndexPattern = async (
  context: SecuritySolutionRequestHandlerContext,
  indexPatterns: IndexPatternsServiceStart
): Promise<void> => {
  const indexPatternService = await indexPatterns.indexPatternsServiceFactory(
    context.core.savedObjects.client,
    context.core.elasticsearch.client.asInternalUser
  );
  console.log('createSourcererIndexPattern');

  await getKibanaIndexPattern(indexPatternService, ['stephbeat-*']);
  // if (!siemClient) {
  //   throw new CreateIndexError('', 404);
  // }
  //
  // const index = siemClient.getSignalsIndex();
  // await ensureMigrationCleanupPolicy({ alias: index, esClient });
  // const policyExists = await getPolicyExists(esClient, index);
  // if (!policyExists) {
  //   await setPolicy(esClient, index, signalsPolicy);
  // }
  // if (await templateNeedsUpdate({ alias: index, esClient })) {
  //   await setTemplate(esClient, index, getSignalsTemplate(index));
  // }
  // const indexExists = await getIndexExists(esClient, index);
  // if (indexExists) {
  //   const indexVersion = await getIndexVersion(esClient, index);
  //   if (isOutdated({ current: indexVersion, target: SIGNALS_TEMPLATE_VERSION })) {
  //     await esClient.indices.rollover({ alias: index });
  //   }
  // } else {
  //   await createBootstrapIndex(esClient, index);
  // }
};
