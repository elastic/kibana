/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { fold, fromNullable, mapNullable } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { find } from 'lodash';
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import { AlertType, AlertExecutorOptions } from '../../types';
import { ESQueryServices } from '.';
import { Params } from './alert_type_params';
import {
  buildEsQuery,
  getTime,
  IIndexPattern,
  IEsSearchResponse,
} from '../../../../../../src/plugins/data/common';
import { AlertServices } from '../../../../alerting/server';

export const ID = '.es-query';

const ActionGroupId = 'query matched';
export function getAlertType(service: ESQueryServices): AlertType {
  const alertTypeName = i18n.translate('xpack.alertingBuiltins.esQuery.alertTypeTitle', {
    defaultMessage: 'ES Query',
  });

  const actionGroupName = i18n.translate(
    'xpack.alertingBuiltins.esQuery.actionGroupQueryMatchedTitle',
    {
      defaultMessage: 'Query Matched',
    }
  );

  return {
    id: ID,
    name: alertTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    executor,
  };

  async function executor({ params, services }: AlertExecutorOptions) {
    const { query, filters = [], timefilter } = params as Params;
    const index = find(filters, filter => !!filter.meta?.index)?.meta?.index;

    const indexPattern = index
      ? await findIndexPatternById(services.indexPattern, index)
      : undefined;

    const {
      rawResponse: { hits: { total = 0, hits = [] } = {} },
    } = (await services.search(
      {
        params: {
          index,
          body: {
            query: buildEsQuery(
              indexPattern,
              query,
              pipe(
                fromNullable(timefilter),
                mapNullable(timeFilter =>
                  indexPattern ? getTime(indexPattern, timeFilter) : undefined
                ),
                fold(
                  () => filters,
                  timeFilter => [...filters, timeFilter]
                )
              )
              // We'll need access to the UISettings via the *start* contract for this to work synchronously
              // , await getEsQueryConfig(uiSettings)
            ),
          },
        },
      },
      {},
      'es'
    )) as IEsSearchResponse;

    // hits.map(hit => {
    //   services
    //     .alertInstanceFactory(hit._id)
    //     .replaceState(hit)
    //     .scheduleActions('default');
    // });
    return {
      totalLastRun: total,
    };
  }
}

/** *
 * We'll want to expose this as a service on the dat aplugin rather than go finding
 * the SavedObject ourselves. This is here just to get a working prototype
 */
export const findIndexPatternById = async (
  indexPattern: AlertServices['indexPattern'],
  index: string
): Promise<IIndexPattern | undefined> => {
  try {
    return await indexPattern.getById(index);
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      throw err;
    }
  }
  return;
};

// async function getEsQueryConfig(config: IUiSettingsClient) {
//   const [
//     allowLeadingWildcards,
//     queryStringOptions,
//     ignoreFilterIfFieldNotInIndex,
//     dateFormatTZ,
//   ] = await Promise.all([
//     config.get('query:allowLeadingWildcards'),
//     config.get('query:queryString:options'),
//     config.get('courier:ignoreFilterIfFieldNotInIndex'),
//     config.get('dateFormat:tz'),
//   ]);

//   return {
//     allowLeadingWildcards,
//     queryStringOptions,
//     ignoreFilterIfFieldNotInIndex,
//     dateFormatTZ,
//   } as EsQueryConfig;
// }
