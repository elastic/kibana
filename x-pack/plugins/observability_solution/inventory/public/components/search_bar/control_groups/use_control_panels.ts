/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { DataView } from '@kbn/data-views-plugin/common';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { pick } from 'lodash';

const HOST_FILTERS_URL_STATE_KEY = 'controlPanels';

const PanelRT = t.intersection([
  t.type({
    order: t.number,
    type: t.string,
  }),
  t.partial({
    width: t.union([t.literal('medium'), t.literal('small'), t.literal('large')]),
    grow: t.boolean,
    dataViewId: t.string,
    fieldName: t.string,
    title: t.union([t.string, t.undefined]),
    selectedOptions: t.array(t.string),
  }),
]);

const ControlPanelsRT = t.record(t.string, PanelRT);
type ControlPanels = t.TypeOf<typeof ControlPanelsRT>;

const cleanControlPanels = (controlPanels: ControlPanels) => {
  return Object.entries(controlPanels).reduce((acc, [key, controlPanelConfig]) => {
    const { dataViewId, ...rest } = controlPanelConfig;
    return {
      ...acc,
      [key]: rest,
    };
  }, {});
};
const encodeUrlState = (value: ControlPanels) => {
  if (value) {
    // Remove the dataView.id on update to make the control panels portable between data views
    const cleanPanels = cleanControlPanels(value);

    return ControlPanelsRT.encode(cleanPanels);
  }
};

const decodeUrlState = (value: unknown) => {
  return pipe(ControlPanelsRT.decode(value), fold(constant(undefined), identity));
};

const controlPanelDefinitions: ControlPanels = {
  'entity.type': {
    order: 0,
    type: 'optionsListControl',
    fieldName: 'entity.type',
    width: 'small',
    grow: false,
    title: 'Type',
  },
};

const controlPanelDefinitionKeys = Object.keys(controlPanelDefinitions);

export function useControlPanels(dataView?: DataView) {
  const visibleControlPanels = controlPanelDefinitionKeys
    .filter((key) => dataView?.fields.getByName(key) !== undefined)
    .reduce<ControlPanels>(
      (acc, currKey) => ({
        ...acc,
        [currKey]: controlPanelDefinitions[currKey],
      }),
      {}
    );

  const [controlPanels, setControlPanels] = useUrlState<ControlPanels>({
    defaultState: visibleControlPanels,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: HOST_FILTERS_URL_STATE_KEY,
    writeDefaultState: true,
  });

  const mergedControlPanels = mergeVisibleControlPanelsWithUrl({
    visibleControlPanels,
    urlControlPanels: controlPanels,
  });

  const controlPanelsWithDataView = Object.keys(mergedControlPanels).reduce<ControlPanels>(
    (acc, currKey) => ({
      ...acc,
      [currKey]: { ...mergedControlPanels[currKey], dataViewId: dataView?.id },
    }),
    {}
  );

  return {
    controlPanels: controlPanelsWithDataView,
    setControlPanels,
  };
}

function mergeVisibleControlPanelsWithUrl({
  visibleControlPanels,
  urlControlPanels,
}: {
  visibleControlPanels: ControlPanels;
  urlControlPanels: ControlPanels;
}) {
  const existingKeys = Object.keys(visibleControlPanels);
  const controlPanelsToOverride = pick(urlControlPanels, existingKeys);
  return { ...visibleControlPanels, ...controlPanelsToOverride };
}
