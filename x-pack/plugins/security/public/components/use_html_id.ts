/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { htmlIdGenerator } from '@elastic/eui';

/**
 * Generates an ID that can be used for HTML elements.
 *
 * @param prefix Prefix of the id to be generated
 * @param suffix Suffix of the id to be generated
 *
 * @example
 * ```typescript
 * const titleId = useHtmlId('changePasswordForm', 'title');
 *
 * <EuiForm aria-labelledby={titleId}>
 *   <h2 id={titleId}>Change password</h2>
 * </EuiForm>
 * ```
 */
export function useHtmlId(prefix?: string, suffix?: string) {
  return useMemo(() => htmlIdGenerator(prefix)(suffix), [prefix, suffix]);
}
