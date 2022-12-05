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
import { ControlGroupInput } from '@kbn/controls-plugin/common';
import { useUrlState } from '../../../../utils/use_url_state';

export const getDefaultPanels = (dataViewId: string): ControlGroupInput['panels'] =>
  ({
    osPanel: {
      order: 0,
      width: 'medium',
      grow: false,
      type: 'optionsListControl',
      explicitInput: {
        id: 'osPanel',
        dataViewId,
        fieldName: 'host.os.name',
        title: 'Operating System',
      },
    },
    cloudProviderPanel: {
      order: 1,
      width: 'medium',
      grow: false,
      type: 'optionsListControl',
      explicitInput: {
        id: 'cloudProviderPanel',
        dataViewId,
        fieldName: 'cloud.provider',
        title: 'Cloud Provider',
      },
    },
  } as unknown as ControlGroupInput['panels']);
const HOST_FILTERS_URL_STATE_KEY = 'controlPanels';

export const useControlPanels = (dataViewId: string) => {
  return useUrlState<ControlPanels>({
    defaultState: getDefaultPanels(dataViewId),
    decodeUrlState,
    encodeUrlState,
    urlStateKey: HOST_FILTERS_URL_STATE_KEY,
  });
};

const PanelRT = rt.type({
  order: rt.number,
  width: rt.union([rt.literal('medium'), rt.literal('small'), rt.literal('large')]),
  grow: rt.boolean,
  type: rt.string,
  explicitInput: rt.intersection([
    rt.type({ id: rt.string }),
    rt.partial({
      dataViewId: rt.string,
      fieldName: rt.string,
      title: rt.union([rt.string, rt.undefined]),
    }),
  ]),
});

const ControlPanelRT = rt.record(rt.string, PanelRT);

type ControlPanels = rt.TypeOf<typeof ControlPanelRT>;
const encodeUrlState = ControlPanelRT.encode;
const decodeUrlState = (value: unknown) => {
  if (value) {
    return pipe(ControlPanelRT.decode(value), fold(constant({}), identity));
  }
};
