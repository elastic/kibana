/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { SanitizedRule, RuleTypeParams } from '../../common';

export interface GetViewInAppUrlFnOpts<Params extends RuleTypeParams> {
  rule: Omit<SanitizedRule<Params>, 'viewInAppRelativeUrl'>;
}
export type GetViewInAppUrlFn<Params extends RuleTypeParams> = (
  opts: GetViewInAppUrlFnOpts<Params>
) => string;

export interface BuildViewInAppRelativeUrlOpts<Params extends RuleTypeParams> {
  getViewInAppUrl: GetViewInAppUrlFn<Params> | undefined;
  opts: GetViewInAppUrlFnOpts<Params>;
}

export function buildViewInAppRelativeUrl<Params extends RuleTypeParams>({
  getViewInAppUrl,
  opts,
}: BuildViewInAppRelativeUrlOpts<Params>) {
  if (!getViewInAppUrl) {
    return;
  }

  return getViewInAppUrl(opts);
}

export interface BuildViewInAppUrlOpts<Params extends RuleTypeParams> {
  kibanaBaseUrl: string | undefined;
  spaceId: string | undefined;
  getViewInAppUrl: GetViewInAppUrlFn<Params> | undefined;
  opts: GetViewInAppUrlFnOpts<Params>;
  logger: Logger;
}

export function buildViewInAppUrl<Params extends RuleTypeParams>({
  kibanaBaseUrl,
  spaceId,
  getViewInAppUrl,
  opts,
  logger,
}: BuildViewInAppUrlOpts<Params>): string | undefined {
  if (!kibanaBaseUrl) {
    return;
  }

  const relativeUrl = buildViewInAppRelativeUrl<Params>({ getViewInAppUrl, opts });

  if (!relativeUrl) {
    return;
  }

  try {
    const viewInAppUrl = new URL(
      `${kibanaBaseUrl}${spaceId !== 'default' ? `/s/${spaceId}` : ''}${relativeUrl}`
    );
    return viewInAppUrl.toString();
  } catch (e) {
    logger.debug(
      `Rule "${opts.rule.id}" encountered an error while constructing the viewInAppUrl variable: ${e.message}`
    );
    return;
  }
}
