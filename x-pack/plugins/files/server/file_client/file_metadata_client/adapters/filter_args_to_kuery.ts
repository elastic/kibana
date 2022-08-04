/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { pipe, forEach } from 'lodash/fp';
import { escapeKuery, KueryNode, nodeBuilder } from '@kbn/es-query';
import { getFlattenedObject } from '@kbn/std';

import { FileMetadata } from '../../../../common/types';
import { FindFileArgs } from '../../../file_service';

export function filterArgsToKuery({
  extension,
  kind,
  meta,
  mimeType,
  name,
  status,
  attrPrefix = '',
}: Omit<FindFileArgs, 'page' | 'perPage'> & { attrPrefix?: string }): undefined | KueryNode {
  const kueryExpressions: KueryNode[] = [];

  const addFilters = (fieldName: keyof FileMetadata, values: string[] = []): void => {
    if (values.length) {
      const orExpressions = values
        .filter(Boolean)
        .map((value) => nodeBuilder.is(`${attrPrefix}.${fieldName}`, escapeKuery(value)));
      kueryExpressions.push(nodeBuilder.or(orExpressions));
    }
  };

  addFilters('name', name);
  addFilters('FileKind', kind);
  addFilters('Status', status);
  addFilters('mime_type', mimeType);
  addFilters('extension', extension);

  if (meta) {
    const addMetaFilters = pipe(
      getFlattenedObject,
      Object.entries,
      forEach(([fieldName, value]) => {
        addFilters(
          `Meta.${fieldName}` as keyof FileMetadata,
          Array.isArray(value) ? value : [value]
        );
      })
    );
    addMetaFilters(meta);
  }

  return kueryExpressions.length ? nodeBuilder.and(kueryExpressions) : undefined;
}
