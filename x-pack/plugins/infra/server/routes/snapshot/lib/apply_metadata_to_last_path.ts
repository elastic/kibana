/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, last, first, isArray } from 'lodash';
import { findInventoryFields } from '../../../../common/inventory_models';
import {
  SnapshotRequest,
  SnapshotNodePath,
  SnapshotNode,
  MetricsAPISeries,
  MetricsAPIRow,
} from '../../../../common/http_api';
import { META_KEY } from './constants';
import { InfraSource } from '../../../lib/sources';

export const isIPv4 = (subject: string) => /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(subject);

type RowWithMetadata = MetricsAPIRow & {
  [META_KEY]: Array<Record<string, string | number | string[]>>;
};

export const applyMetadataToLastPath = (
  series: MetricsAPISeries,
  node: SnapshotNode,
  snapshotRequest: SnapshotRequest,
  source: InfraSource
): SnapshotNodePath[] => {
  // First we need to find a row with metadata
  const rowWithMeta = series.rows.find(
    (row) => (row[META_KEY] && isArray(row[META_KEY]) && (row[META_KEY] as object[]).length) || 0
  ) as RowWithMetadata | undefined;

  if (rowWithMeta) {
    // We need just the first doc, there should only be one
    const firstMetaDoc = first(rowWithMeta[META_KEY]);
    // We also need the last path to add the metadata to
    const lastPath = last(node.path);
    if (firstMetaDoc && lastPath) {
      // We will need the inventory fields so we can use the field paths to get
      // the values from the metadata document
      const inventoryFields = findInventoryFields(snapshotRequest.nodeType);
      // Set the label as the name and fallback to the id OR path.value
      lastPath.label = (firstMetaDoc[inventoryFields.name] ?? lastPath.value) as string;
      // If the inventory fields contain an ip address, we need to try and set that
      // on the path object. IP addersses are typically stored as multiple fields. We will
      // use the first IPV4 address we find.
      if (inventoryFields.ip) {
        const ipAddresses = get(firstMetaDoc, inventoryFields.ip) as string[];
        if (Array.isArray(ipAddresses)) {
          lastPath.ip = ipAddresses.find(isIPv4) || null;
        } else if (typeof ipAddresses === 'string') {
          lastPath.ip = ipAddresses;
        }
      }
      return [...node.path.slice(0, node.path.length - 1), lastPath];
    }
  }
  return node.path;
};
