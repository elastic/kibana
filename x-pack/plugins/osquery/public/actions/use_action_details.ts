/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createFilter } from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import {
  DocValueFields,
  OsqueryQueries,
  ActionDetailsRequestOptions,
  ActionDetailsStrategyResponse,
} from '../../common/search_strategy';
import { ESTermQuery } from '../../common/typed_json';

import * as i18n from './translations';
import { isCompleteResponse, isErrorResponse } from '../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../src/plugins/kibana_utils/common';
import { getInspectResponse, InspectResponse } from './helpers';

const ID = 'actionDetailsQuery';

export interface ActionDetailsArgs {
  actionDetails: Record<string, string>;
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
}

interface UseActionDetails {
  actionId: string;
  docValueFields?: DocValueFields[];
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
}

export const useActionDetails = ({
  actionId,
  docValueFields,
  filterQuery,
  skip = false,
}: UseActionDetails): [boolean, ActionDetailsArgs] => {
  const { data, notifications } = useKibana().services;

  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [actionDetailsRequest, setHostRequest] = useState<ActionDetailsRequestOptions | null>(null);

  const [actionDetailsResponse, setActionDetailsResponse] = useState<ActionDetailsArgs>({
    actionDetails: {},
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
  });

  const actionDetailsSearch = useCallback(
    (request: ActionDetailsRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(request, {
            strategy: 'osquerySearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setActionDetailsResponse((prevResponse) => ({
                    ...prevResponse,
                    actionDetails: response.actionDetails,
                    inspect: getInspectResponse(response, prevResponse.inspect),
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (isErrorResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_ACTION_DETAILS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_ACTION_DETAILS,
                  text: msg.message,
                });
              }
            },
          });
      };
      abortCtrl.current.abort();
      asyncSearch();
      return () => {
        didCancel = true;
        abortCtrl.current.abort();
      };
    },
    [data.search, notifications.toasts, skip]
  );

  useEffect(() => {
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        actionId,
        docValueFields: docValueFields ?? [],
        factoryQueryType: OsqueryQueries.actionDetails,
        filterQuery: createFilter(filterQuery),
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [actionId, docValueFields, filterQuery]);

  useEffect(() => {
    actionDetailsSearch(actionDetailsRequest);
  }, [actionDetailsRequest, actionDetailsSearch]);

  return [loading, actionDetailsResponse];
};
