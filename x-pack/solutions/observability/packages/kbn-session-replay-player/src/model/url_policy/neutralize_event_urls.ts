/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventType } from '@rrweb/types';
import type { ReplayEvent } from '../../types';
import { createUrlAllowance } from './allowed_urls';
import { neutralizeCss } from './css_urls';
import { isPayload, neutralizeAttributes, NEUTRALIZED_URL } from './fetch_attributes';
import type { Payload } from './fetch_attributes';

/** rrweb node types, as serialized into snapshots and mutations. */
const ELEMENT_NODE = 2;
const TEXT_NODE = 3;

/** Only these events are interpreted by rrweb; the rest are never applied to the replayed document. */
const INTERPRETED_EVENT_TYPES: ReadonlySet<number> = new Set([
  EventType.FullSnapshot,
  EventType.IncrementalSnapshot,
  EventType.Asset,
]);

/** Keys that hold a URL in non-DOM payloads, such as canvas image arguments and asset events. */
const URL_KEYS: ReadonlySet<string> = new Set(['src', 'url']);
/** Keys that hold CSS text in stylesheet payloads. */
const CSS_KEYS: ReadonlySet<string> = new Set(['rule', 'replace', 'cssText']);

interface SerializedElement extends Payload {
  id: number;
  tagName: string;
  attributes: Payload;
  childNodes: unknown;
}
interface SerializedText extends Payload {
  id: number;
  textContent: string;
}
interface AttributeMutation extends Payload {
  id: number;
  attributes: Payload;
}
interface TextMutation extends Payload {
  id: number;
  value: string;
}

const isSerializedElement = (value: Payload): value is SerializedElement =>
  value.type === ELEMENT_NODE &&
  typeof value.id === 'number' &&
  typeof value.tagName === 'string' &&
  isPayload(value.attributes);

const isSerializedText = (value: Payload): value is SerializedText =>
  value.type === TEXT_NODE && typeof value.id === 'number' && typeof value.textContent === 'string';

const isAttributeMutation = (value: Payload): value is AttributeMutation =>
  typeof value.id === 'number' && isPayload(value.attributes) && !('tagName' in value);

const isTextMutation = (value: Payload): value is TextMutation =>
  typeof value.id === 'number' && typeof value.value === 'string' && !('property' in value);

const hasSameEntries = (a: Payload, b: Payload): boolean => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
};

export interface EventUrlNeutralizerOptions {
  /** Origins from which images may load; every other remote URL is neutralised. */
  allowedOrigins?: readonly string[];
}

/**
 * Creates a function that neutralises the URLs in recorded events that would make the player's
 * browser fetch remote content. Only URLs that fetch are touched: displayed URLs (the recorded page
 * address, text, links) are left as recorded.
 *
 * The walk is structural: it keys on element names, attribute names, CSS strings and a few
 * payload key names, not on the kind of event, so new event kinds are covered as long as they
 * carry URLs under those names. The returned function remembers which element each node id belongs
 * to, so it must see events in recording order.
 */
export const createEventUrlNeutralizer = ({
  allowedOrigins = [],
}: EventUrlNeutralizerOptions = {}): (<TEvent extends ReplayEvent>(event: TEvent) => TEvent) => {
  const allowance = createUrlAllowance(allowedOrigins);
  const tagByNodeId = new Map<number, string>();
  const styleTextNodeIds = new Set<number>();

  const visitElement = (element: SerializedElement): Payload => {
    const tag = element.tagName.toLowerCase();
    tagByNodeId.set(element.id, tag);
    const attributes = neutralizeAttributes({
      tag,
      attributes: element.attributes,
      removal: 'delete',
      allowance,
    });
    const childNodes = visit(element.childNodes);
    return hasSameEntries(attributes, element.attributes) && childNodes === element.childNodes
      ? element
      : { ...element, attributes, childNodes };
  };

  const visitText = (text: SerializedText): Payload => {
    if (text.isStyle !== true) {
      return text;
    }
    styleTextNodeIds.add(text.id);
    const textContent = neutralizeCss(text.textContent, allowance);
    return textContent === text.textContent ? text : { ...text, textContent };
  };

  const visitString = (parent: Payload, key: string, value: string): string => {
    if (URL_KEYS.has(key) || (key === 'fontSource' && parent.buffer !== true)) {
      return allowance.isAllowedImageUrl(value) ? value : NEUTRALIZED_URL;
    }
    if (CSS_KEYS.has(key) || (key === 'value' && typeof parent.property === 'string')) {
      return neutralizeCss(value, allowance);
    }
    return value;
  };

  const visitObject = (value: Payload): Payload => {
    let result: Payload | undefined;
    for (const [key, entry] of Object.entries(value)) {
      const visited = typeof entry === 'string' ? visitString(value, key, entry) : visit(entry);
      if (visited !== entry) {
        result = result ?? { ...value };
        result[key] = visited;
      }
    }
    return result ?? value;
  };

  function visit(value: unknown): unknown {
    if (Array.isArray(value)) {
      const visited = value.map(visit);
      return visited.every((entry, position) => entry === value[position]) ? value : visited;
    }
    if (!isPayload(value)) {
      return value;
    }
    if (isSerializedElement(value)) {
      return visitElement(value);
    }
    if (isSerializedText(value)) {
      return visitText(value);
    }
    if (isAttributeMutation(value)) {
      const attributes = neutralizeAttributes({
        tag: tagByNodeId.get(value.id),
        attributes: value.attributes,
        removal: 'null',
        allowance,
      });
      return hasSameEntries(attributes, value.attributes) ? value : { ...value, attributes };
    }
    if (isTextMutation(value)) {
      if (!styleTextNodeIds.has(value.id)) {
        return value;
      }
      const cssText = neutralizeCss(value.value, allowance);
      return cssText === value.value ? value : { ...value, value: cssText };
    }
    return visitObject(value);
  }

  const neutralizeEvent = <TEvent extends ReplayEvent>(event: TEvent): TEvent => {
    if (!INTERPRETED_EVENT_TYPES.has(event.type)) {
      return event;
    }
    // Intentional `as TEvent` type assertion as the walk is generic over opaque payloads and rebuilds the event with the same shape;
    return visit(event) as TEvent;
  };

  return neutralizeEvent;
};
