/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { SanitizedRule, RuleTypeParams } from '../../common';

export interface GetViewInAppRelativeUrlFnOpts<Params extends RuleTypeParams> {
  rule: Omit<SanitizedRule<Params>, 'viewInAppRelativeUrl'>;
}
export type GetViewInAppRelativeUrlFn<Params extends RuleTypeParams> = (
  opts: GetViewInAppRelativeUrlFnOpts<Params>
) => string;

export interface BuildViewInAppRelativeUrlOpts<Params extends RuleTypeParams> {
  getViewInAppRelativeUrl: GetViewInAppRelativeUrlFn<Params> | undefined;
  opts: GetViewInAppRelativeUrlFnOpts<Params>;
}

export function buildViewInAppRelativeUrl<Params extends RuleTypeParams>({
  getViewInAppRelativeUrl,
  opts,
}: BuildViewInAppRelativeUrlOpts<Params>) {
  if (!getViewInAppRelativeUrl) {
    return;
  }

  return getViewInAppRelativeUrl(opts);
}

export interface BuildViewInAppUrlOpts<Params extends RuleTypeParams> {
  kibanaBaseUrl: string | undefined;
  spaceId: string | undefined;
  getViewInAppRelativeUrl: GetViewInAppRelativeUrlFn<Params> | undefined;
  opts: GetViewInAppRelativeUrlFnOpts<Params>;
  logger: Logger;
}

export function buildViewInAppUrl<Params extends RuleTypeParams>({
  kibanaBaseUrl,
  spaceId,
  getViewInAppRelativeUrl,
  opts,
  logger,
}: BuildViewInAppUrlOpts<Params>): string | undefined {
  if (!kibanaBaseUrl) {
    return;
  }

  const relativeUrl = buildViewInAppRelativeUrl<Params>({ getViewInAppRelativeUrl, opts });

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
