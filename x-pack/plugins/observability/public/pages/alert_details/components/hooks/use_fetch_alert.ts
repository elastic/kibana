/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Subscription } from 'rxjs';
import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/common';
import type {
    EcsFieldsResponse,
    RuleRegistrySearchRequest,
    RuleRegistrySearchResponse,
} from '@kbn/rule-registry-plugin/common/search_strategy';

import { ObservabilityAppServices } from '../../../../application/types';
import { useKibana } from '../../../../utils/kibana_react';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface FetchAlertArgs {
    featureIds: ValidFeatureId[];
    query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
}

type AlertRequest = Omit<FetchAlertArgs, 'featureIds'>;

export interface AlertResponse {
    alert: EcsFieldsResponse;
}

interface AlertStateReducer {
    loading: boolean;
    request: FetchAlertArgs;
    response: AlertResponse;
}

type AlertActions =
    | { type: 'loading'; loading: boolean }
    | { type: 'response'; alert: EcsFieldsResponse }
    | { type: 'request'; request: FetchAlertArgs };

const initialAlertState: AlertStateReducer = {
    loading: false,
    request: {
        featureIds: [],
        query: {
            bool: {},
        }
    },
    response: {
        alert: {} as EcsFieldsResponse,
    },
};

function alertReducer(state: AlertStateReducer, action: AlertActions) {
    switch (action.type) {
        case 'loading':
            return { ...state, loading: action.loading };
        case 'response':
            return {
                ...state,
                loading: false,
                response: {
                    isInitializing: false,
                    alert: action.alert
                },
            };
        case 'request':
            return { ...state, request: action.request };
        default:
            throw new Error();
    }
}

export type UseFetchAlert = ({
    featureIds,
    query
}: FetchAlertArgs) => [boolean, AlertResponse];

const useFetchAlert = ({ featureIds, query }: FetchAlertArgs): [boolean, AlertResponse] => {
    const [{ loading, request: alertRequest, response: alertResponse }, dispatch] = useReducer(
        alertReducer,
        initialAlertState
    );

    const prevAlertRequest = useRef<AlertRequest | null>(null);

    const searchSubscription$ = useRef(new Subscription());
    const { data } = useKibana<ObservabilityAppServices>().services;

    const fetchAlert = useCallback(
        (request: AlertRequest | null) => {
            if (request == null) {
                return;
            }

            const asyncSearch = async () => {
                prevAlertRequest.current = request;
                dispatch({ type: 'loading', loading: true });

                if (data && data.search) {
                    searchSubscription$.current = data.search
                        .search<RuleRegistrySearchRequest, RuleRegistrySearchResponse>(
                            { ...request, featureIds, fields: undefined, query },
                            {
                                strategy: 'privateRuleRegistryAlertsSearchStrategy',
                            }
                        )
                        .subscribe({
                            next: (response) => {
                                if (isCompleteResponse(response)) {
                                    const { rawResponse } = response;
                                    let alert: EcsFieldsResponse = {} as EcsFieldsResponse;

                                    if (rawResponse.hits && rawResponse.hits.hits && rawResponse.hits.hits.length > 0) {
                                        const hit = rawResponse.hits.hits[0];
                                        alert = {
                                            ...hit.fields,
                                            _id: hit._id,
                                            _index: hit._index
                                        } as EcsFieldsResponse;
                                    }

                                    dispatch({
                                        type: 'response',
                                        alert
                                    });

                                    dispatch({
                                        type: 'loading',
                                        loading: false
                                    });

                                    searchSubscription$.current.unsubscribe();
                                } else if (isErrorResponse(response)) {
                                    dispatch({ type: 'loading', loading: false });
                                    data.search.showError(new Error('i18n.ERROR_FETCH_ALERTS'));
                                    searchSubscription$.current.unsubscribe();
                                }
                            },
                            error: (msg) => {
                                dispatch({ type: 'loading', loading: false });
                                data.search.showError(msg);
                                searchSubscription$.current.unsubscribe();
                            },
                        });
                }
            };

            searchSubscription$.current.unsubscribe();
            asyncSearch();
        }, [data, featureIds, query]);

    useEffect(() => {
        if (featureIds.length === 0) {
            return;
        }
        const newAlertRequest = {
            featureIds,
            query
        };
        if (!deepEqual(newAlertRequest, prevAlertRequest.current)) {
            dispatch({
                type: 'request',
                request: newAlertRequest,
            });
        }
    }, [featureIds, query]);

    useEffect(() => {
        if (alertRequest.featureIds.length > 0 && !deepEqual(alertRequest, prevAlertRequest.current)) {
            fetchAlert(alertRequest);
        }
    }, [alertRequest, fetchAlert]);

    const alertResponseMemo = useMemo(
        () => ({
            ...alertResponse
        }),
        [alertResponse]
    );

    return [loading, alertResponseMemo];
};

export { useFetchAlert };
