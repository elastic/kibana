/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type AnchorHTMLAttributes } from 'react';
import { EuiButtonEmpty, type EuiButtonEmptyProps } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { type ObservabilityOnboardingContextValue } from '../../../plugin';

type EuiButtonEmptyPropsForAnchor = Extract<
  EuiButtonEmptyProps,
  AnchorHTMLAttributes<HTMLAnchorElement>
>;

export interface LocatorButtonEmptyProps<Params extends SerializableRecord>
  extends Omit<EuiButtonEmptyPropsForAnchor, 'href'> {
  locatorId: string;
  params: Params;
}

/**
 * Same as `EuiButtonEmpty` but uses locators to navigate instead of URLs.
 *
 * Accepts the following props instead of an `href`:
 * - `locatorId`: The id of the locator to use.
 * - `params`: The params to pass to the locator.
 *
 * Get type safety for `params` by passing the correct type to the generic component.
 *
 * Example:
 *
 * ```ts
 * import { type SingleDatasetLocatorParams, SINGLE_DATASET_LOCATOR_ID } from '@kbn/deeplinks-observability/locators';
 *
 * <LocatorButtonEmpty<SingleDatasetLocatorParams>
 *   locatorId={SINGLE_DATASET_LOCATOR_ID}
 *   params={{
 *     integration: 'system',
 *     dataset: 'system.syslog',
 *   }}
 * >
 *   Go to Logs Explorer
 * </LocatorButtonEmpty>
 * ```
 */
export const LocatorButtonEmpty = <Params extends SerializableRecord>({
  locatorId,
  params,
  ...rest
}: LocatorButtonEmptyProps<Params>) => {
  const {
    services: { share },
  } = useKibana<ObservabilityOnboardingContextValue>();

  const locator = share.url.locators.get<Params>(locatorId);

  return (
    <EuiButtonEmpty
      data-test-subj="observabilityOnboardingLocatorButtonEmptyButton"
      href={locator?.useUrl(params)}
      {...rest}
    />
  );
};
