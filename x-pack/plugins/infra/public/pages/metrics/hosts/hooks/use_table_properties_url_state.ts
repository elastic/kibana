/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { useUrlState } from '../../../../utils/use_url_state';

export const GET_DEFAULT_TABLE_PROPERTIES = {
  sorting: true,
  pagination: true,
};
const HOST_TABLE_PROPERTIES_URL_STATE_KEY = 'tableProperties';

type Action = rt.TypeOf<typeof ActionRT>;
type PropertiesUpdater = (newProps: Action) => void;

export const useTableProperties = (): [TableProperties, PropertiesUpdater] => {
  const [urlState, setUrlState] = useUrlState<TableProperties>({
    defaultState: GET_DEFAULT_TABLE_PROPERTIES,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: HOST_TABLE_PROPERTIES_URL_STATE_KEY,
  });

  const setProperties = (newProps: Action) => setUrlState({ ...urlState, ...newProps });

  return [urlState, setProperties];
};

const PaginationRT = rt.union([
  rt.boolean,
  rt.partial({ pageIndex: rt.number, pageSize: rt.number }),
]);
const SortingRT = rt.union([rt.boolean, rt.type({ field: rt.string, direction: rt.any })]);

const SetSortingRT = rt.partial({
  sorting: SortingRT,
});

const SetPaginationRT = rt.partial({
  pagination: PaginationRT,
});

const ActionRT = rt.intersection([SetSortingRT, SetPaginationRT]);

const TablePropertiesRT = rt.type({
  pagination: PaginationRT,
  sorting: SortingRT,
});

type TableProperties = rt.TypeOf<typeof TablePropertiesRT>;

const encodeUrlState = TablePropertiesRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(TablePropertiesRT.decode(value), fold(constant(undefined), identity));
};
