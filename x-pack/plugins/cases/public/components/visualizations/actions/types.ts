/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Embeddable } from '@kbn/embeddable-plugin/public';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { CasesContextProps } from '../../cases_context';

export type UIActionProps = Pick<
  CasesContextProps,
  | 'externalReferenceAttachmentTypeRegistry'
  | 'persistableStateAttachmentTypeRegistry'
  | 'getFilesClient'
>;

export type DashboardVisualizationEmbeddable = Embeddable<{
  attributes: TypedLensByValueInput['attributes'];
  id: string;
  timeRange: { from: string; to: string; fromStr: string; toStr: string };
}>;
