/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This file contains all the logic for mapping from trigger's context and environment context to variables for URL drilldown scope
 * URL drilldown has 3 sources for variables:
 *
 * - Global static variables like, for example, `kibanaUrl`. Such variables won’t change depending on a place where url drilldown is used.
 * - Context variables are dynamic and different depending on where drilldown is created and used. For example:
 * - Event variables depend on a trigger context. These variables are dynamically extracted from the action context when drilldown is executed.
 *
 * At this point context variables are extracted from `embeddable` and event variables are extracted from trigger's context.
 * Only 2 triggers are supported at this point: VALUE_CLICK_TRIGGER and RANGE_SELECT_TRIGGER
 *
 * In future URL drilldown implementation will provide extension points
 * for injecting more variables into context and to support more triggers
 * https://github.com/elastic/kibana/issues/55324
 *
 * For now possible variables and logic for extracting those are hardcoded and all contained in this file.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiRadioGroup,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import type { Query, Filter, TimeRange } from '../../../../../../src/plugins/data/public';
import {
  IEmbeddable,
  isRangeSelectTriggerContext,
  isValueClickTriggerContext,
  RangeSelectContext,
  ValueClickContext,
} from '../../../../../../src/plugins/embeddable/public';
import type { ActionContext, ActionFactoryContext, UrlTrigger } from './url_drilldown';
import { SELECT_RANGE_TRIGGER } from '../../../../../../src/plugins/ui_actions/public';
import { OverlayStart } from '../../../../../../src/core/public';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';

type ContextScopeInput = ActionContext | ActionFactoryContext;

/**
 * Part of context scope extracted from an embeddable
 * Expose on the scope as: `{{context.panel.id}}` `{{context.panel.filters.[0]}}`
 */
interface EmbeddableUrlDrilldownContextScope {
  id: string;
  title?: string;
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
  savedObjectId?: string;
  /**
   * In case panel supports only 1 index patterns
   */
  indexPatternId?: string;
  /**
   * In case panel supports more then 1 index patterns
   */
  indexPatternIds?: string[];
}

/**
 * Url drilldown context scope
 * `{{context.$}}`
 */
interface UrlDrilldownContextScope {
  panel?: EmbeddableUrlDrilldownContextScope;
}

export function getContextScope(contextScopeInput: ContextScopeInput): UrlDrilldownContextScope {
  if (!hasEmbeddable(contextScopeInput))
    throw new Error(
      "UrlDrilldown [getContextScope] can't build scope because embeddable object is missing in context"
    );

  const embeddable = contextScopeInput.embeddable;
  const input = embeddable.getInput();
  const output = embeddable.getOutput();
  function isSavedObjectId(savedObjectId: unknown): savedObjectId is string {
    return typeof savedObjectId === 'string';
  }
  function getIndexPatternIds(): string[] {
    function hasIndexPatterns(
      _output: Record<string, any>
    ): _output is { indexPatterns: Array<{ id?: string }> } {
      return (
        'indexPatterns' in _output &&
        Array.isArray(_output.indexPatterns) &&
        _output.indexPatterns.length > 0
      );
    }
    return hasIndexPatterns(output)
      ? (output.indexPatterns.map((ip) => ip.id).filter(Boolean) as string[])
      : [];
  }
  const indexPatternsIds = getIndexPatternIds();
  return {
    panel: cleanEmptyKeys({
      id: input.id,
      title: output.title ?? input.title,
      savedObjectId:
        output.savedObjectId ??
        (isSavedObjectId(input.savedObjectId) ? input.savedObjectId : undefined),
      query: input.query,
      timeRange: input.timeRange,
      filters: input.filters,
      indexPatternIds: indexPatternsIds.length > 1 ? indexPatternsIds : undefined,
      indexPatternId: indexPatternsIds.length === 1 ? indexPatternsIds[0] : undefined,
    }),
  };
}

function hasEmbeddable(val: unknown): val is { embeddable: IEmbeddable } {
  if (val && typeof val === 'object' && 'embeddable' in val) return true;
  return false;
}

/**
 * URL drilldown event scope,
 * available as: {{event.key}}, {{event.from}}
 */
type UrlDrilldownEventScope = ValueClickTriggerEventScope | RangeSelectTriggerEventScope;
type EventScopeInput = ActionContext;
interface ValueClickTriggerEventScope {
  key: string;
  value: string;
  negate: boolean;
}

interface RangeSelectTriggerEventScope {
  key: string;
  from: string;
  to: string;
}

export async function getEventScope(
  eventScopeInput: EventScopeInput,
  deps: { getOpenModal: () => Promise<OverlayStart['openModal']> },
  opts: { allowPrompts: boolean } = { allowPrompts: false }
): Promise<UrlDrilldownEventScope> {
  if (isRangeSelectTriggerContext(eventScopeInput)) {
    return getEventScopeFromRangeSelectTriggerContext(eventScopeInput);
  } else if (isValueClickTriggerContext(eventScopeInput)) {
    return getEventScopeFromValueClickTriggerContext(eventScopeInput, deps, opts);
  } else {
    throw new Error("UrlDrilldown [getEventScope] can't build scope from not supported trigger");
  }
}

async function getEventScopeFromRangeSelectTriggerContext(
  eventScopeInput: RangeSelectContext
): Promise<RangeSelectTriggerEventScope> {
  const { table, column: columnIndex, range } = eventScopeInput.data;
  const column = table.columns[columnIndex];
  return cleanEmptyKeys({
    key: toStringOrUndefined(column?.meta?.aggConfigParams?.field)!,
    from: toStringOrUndefined(range[0])!,
    to: toStringOrUndefined(range[range.length - 1])!,
  });
}

async function getEventScopeFromValueClickTriggerContext(
  eventScopeInput: ValueClickContext,
  deps: { getOpenModal: () => Promise<OverlayStart['openModal']> },
  opts: { allowPrompts: boolean } = { allowPrompts: false }
): Promise<ValueClickTriggerEventScope> {
  const negate = eventScopeInput.data.negate ?? false;
  const { table, column: columnIndex, value } = await getSingleValue(
    eventScopeInput.data.data,
    deps,
    opts
  );
  const column = table.columns[columnIndex];
  return cleanEmptyKeys({
    key: toStringOrUndefined(column?.meta?.aggConfigParams?.field)!,
    value: toStringOrUndefined(value)!,
    negate,
  });
}

/**
 * @remarks
 * Difference between `event` and `context` variables, is that real `context` variables are available during drilldown creation (e.g. embeddable panel)
 * `event` variables are mapped from trigger context. Since there is no trigger context during drilldown creation, we have to provide some _mock_ variables for validating and previewing the URL
 */
export function getMockEventScope([trigger]: UrlTrigger[]): UrlDrilldownEventScope {
  if (trigger === SELECT_RANGE_TRIGGER) {
    return {
      key: '__testKey__',
      from: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      to: new Date().toISOString(),
    };
  } else {
    return {
      key: '__testKey__',
      value: '__testValue__',
      negate: false,
    };
  }
}

function toStringOrUndefined(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v instanceof Date) return v.toISOString();
  return typeof v === 'undefined' ? v : String(v);
}

function cleanEmptyKeys<T extends Record<string, any>>(obj: T): T {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
}

/**
 * VALUE_CLICK_TRIGGER could have multiple data points
 * Prompt user which data point to use in a drilldown
 */
async function getSingleValue(
  data: ValueClickContext['data']['data'],
  deps: { getOpenModal: () => Promise<OverlayStart['openModal']> },
  opts: { allowPrompts: boolean } = { allowPrompts: false }
): Promise<ValueClickContext['data']['data'][0]> {
  data = data.filter(Boolean);
  if (data.length === 0)
    throw new Error(`[trigger = "VALUE_CLICK_TRIGGER"][getSingleValue] no value to pick from`);
  if (data.length === 1) return Promise.resolve(data[0]);
  if (!opts.allowPrompts) return Promise.resolve(data[0]);
  return new Promise(async (resolve, reject) => {
    const openModal = await deps.getOpenModal();
    const overlay = openModal(
      toMountPoint(
        <GetSingleValuePopup
          onCancel={() => overlay.close()}
          onSubmit={(point) => {
            if (point) {
              resolve(point);
            }
            overlay.close();
          }}
          data={data}
        />
      )
    );
    overlay.onClose.then(() => reject());
  });
}

function GetSingleValuePopup({
  data,
  onCancel,
  onSubmit,
}: {
  data: ValueClickContext['data']['data'];
  onCancel: () => void;
  onSubmit: (value: ValueClickContext['data']['data'][0]) => void;
}) {
  const values = data
    .map((point) => {
      const { table, column: columnIndex, value } = point;
      const column = table.columns[columnIndex];
      return {
        point,
        id: toStringOrUndefined(column?.meta?.aggConfigParams?.field)!,
        label: `${toStringOrUndefined(column?.meta?.aggConfigParams?.field)!}:${toStringOrUndefined(
          value
        )!}`,
      };
    })
    .filter((value) => Boolean(value.id));

  const [selectedValueId, setSelectedValueId] = React.useState(values[0].id);

  return (
    <React.Fragment>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.embeddableEnhanced.drilldowns.pickSingleValuePopup.popupHeader"
            defaultMessage="Select a value to drill down into"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiRadioGroup
          options={values}
          idSelected={selectedValueId}
          onChange={(id) => setSelectedValueId(id)}
          name="drilldownValues"
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>
          <FormattedMessage
            id="xpack.embeddableEnhanced.drilldowns.pickSingleValuePopup.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          onClick={() => onSubmit(values.find((v) => v.id === selectedValueId)?.point!)}
          data-test-subj="applySingleValuePopoverButton"
          fill
        >
          <FormattedMessage
            id="xpack.embeddableEnhanced.drilldowns.pickSingleValuePopup.applyButtonLabel"
            defaultMessage="Apply"
          />
        </EuiButton>
      </EuiModalFooter>
    </React.Fragment>
  );
}
