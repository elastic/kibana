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
import { ControlPanelState } from '@kbn/controls-plugin/common';
import { DataView } from '@kbn/data-views-plugin/public';
import { DataControlInput } from '@kbn/controls-plugin/public';
import { useUrlState } from '../../../../utils/use_url_state';

export const getDefaultPanels = (
  dataViewId: string
): Record<string, ControlPanelState<DataControlInput>> => ({
  'host.os.name': {
    order: 0,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    explicitInput: {
      id: 'host.os.name',
      dataViewId,
      fieldName: 'host.os.name',
      title: 'Operating System',
    },
  },
  'cloud.provider': {
    order: 1,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    explicitInput: {
      id: 'cloud.provider',
      dataViewId,
      fieldName: 'cloud.provider',
      title: 'Cloud Provider',
    },
  },
});

const getAvailableControlPanels = (dataView: DataView) => {
  const defaultPanels = getDefaultPanels(dataView.id ?? '');

  return Object.entries(defaultPanels).reduce((panels, [panelName, config], pos) => {
    if (dataView.fields.getByName(panelName) === undefined) {
      return panels;
    }

    return { ...panels, [panelName]: { ...config, order: pos } };
  }, {});
};

const HOST_FILTERS_URL_STATE_KEY = 'controlPanels';

export const useControlPanels = (dataView: DataView) => {
  const defaultState = getAvailableControlPanels(dataView);

  return useUrlState<ControlPanels>({
    defaultState,
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
