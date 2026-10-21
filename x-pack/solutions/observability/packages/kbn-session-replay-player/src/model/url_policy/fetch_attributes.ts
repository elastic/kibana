/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UrlAllowance } from './allowed_urls';
import { neutralizeCss } from './css_urls';

/** An opaque rrweb payload, walked structurally without assuming its shape. */
export interface Payload {
  [key: string]: unknown;
}

export const isPayload = (value: unknown): value is Payload =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Neutral target for a URL that must not load. */
export const NEUTRALIZED_URL = 'about:blank';

const DROP = Symbol('drop');

/** Elements that start a nested browsing context; their content can fetch again, so nothing loads. */
const NESTED_CONTEXT_TAGS = new Set(['iframe', 'frame', 'embed']);
/** Attributes that carry markup or stylesheets, which can fetch on their own. */
const MARKUP_ATTRIBUTES = new Set(['srcdoc', 'imagesrcset']);
const SINGLE_DATA_URL_CANDIDATE = /^data:[^\s,]*,[^\s]*(?:\s+\S+)?$/i;
const META_REFRESH_TARGET = /url\s*=/i;

const neutralizeStyleValue = (value: unknown, allowance: UrlAllowance): unknown => {
  if (typeof value === 'string') {
    return neutralizeCss(value, allowance);
  }
  if (Array.isArray(value)) {
    return value.map((entry) =>
      typeof entry === 'string' ? neutralizeCss(entry, allowance) : entry
    );
  }
  return value;
};

const neutralizeStyleAttribute = (value: unknown, allowance: UrlAllowance): unknown => {
  if (isPayload(value)) {
    const result: Payload = {};
    for (const [property, propertyValue] of Object.entries(value)) {
      result[property] = neutralizeStyleValue(propertyValue, allowance);
    }
    return result;
  }
  return neutralizeStyleValue(value, allowance);
};

const neutralizeAttribute = (
  tag: string | undefined,
  name: string,
  value: unknown,
  allowance: UrlAllowance
): unknown => {
  if (name === 'style') {
    return neutralizeStyleAttribute(value, allowance);
  }
  if (typeof value !== 'string') {
    return value;
  }
  if (name === '_csstext') {
    return neutralizeCss(value, allowance);
  }
  if (MARKUP_ATTRIBUTES.has(name)) {
    return DROP;
  }
  switch (name) {
    case 'href':
    case 'xlink:href':
      // Links are inert under the sandbox and only displayed; every other `href` can fetch.
      if (tag === 'a' || tag === 'area') {
        return value;
      }
      return tag === 'image' && allowance.isAllowedImageUrl(value) ? value : DROP;
    case 'src':
      if (tag === 'script' || (tag !== undefined && NESTED_CONTEXT_TAGS.has(tag))) {
        return DROP;
      }
      return allowance.isAllowedImageUrl(value) ? value : DROP;
    case 'rr_src':
      // rrweb records the source of an iframe here and never applies it on rebuild, so it cannot fetch.
      // It is dropped anyway so that no disallowed origin appears anywhere in a neutralised stream.
      return DROP;
    case 'poster':
    case 'background':
    case 'rr_dataurl':
      // `rr_dataURL` is applied as the source of an image when rrweb rebuilds canvases and images.
      return allowance.isAllowedImageUrl(value) ? value : DROP;
    case 'srcset':
      return SINGLE_DATA_URL_CANDIDATE.test(value.trim()) ? value : DROP;
    case 'data':
      return tag === undefined || tag === 'object' ? DROP : value;
    case 'content':
      return META_REFRESH_TARGET.test(value) ? DROP : value;
    default:
      return value;
  }
};

/**
 * Neutralises the attributes that make the browser fetch remote content. `tag` is the element the
 * attributes belong to; it is `undefined` for attribute changes of an element seen earlier that
 * the caller could not resolve, in which case ambiguous attributes are dropped.
 */
export const neutralizeAttributes = ({
  tag,
  attributes,
  removal,
  allowance,
}: {
  tag: string | undefined;
  attributes: Payload;
  /** `'null'` keeps a `null` entry, which rrweb applies as an attribute removal. */
  removal: 'delete' | 'null';
  allowance: UrlAllowance;
}): Payload => {
  const result: Payload = {};
  for (const [name, value] of Object.entries(attributes)) {
    const neutralized = neutralizeAttribute(tag, name.toLowerCase(), value, allowance);
    if (neutralized !== DROP) {
      result[name] = neutralized;
    } else if (removal === 'null') {
      result[name] = null;
    }
  }
  return result;
};
