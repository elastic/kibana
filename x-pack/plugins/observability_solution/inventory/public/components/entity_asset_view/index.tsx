/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useRef } from 'react';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { AbortableAsyncState } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { Entity, EntityLink, IdentityField } from '../../../common/entities';
import { EntitySuggestionsTable } from './entity_suggestions_table';
import { EntityLinksTable } from './entity_links_table';
import { Link } from '../../../common/links';
import { useKibana } from '../../hooks/use_kibana';

export function EntityAssetView({
  entity,
  linksFetch,
  identityFields,
  onEntityUpdate,
}: {
  entity: Entity;
  linksFetch: AbortableAsyncState<EntityLink[]>;
  identityFields: IdentityField[];
  onEntityUpdate: () => Promise<void>;
}) {
  const { signal } = useAbortController();
  const {
    services: { inventoryAPIClient },
  } = useKibana();

  const onEntityUpdateRef = useRef(onEntityUpdate);

  onEntityUpdateRef.current = onEntityUpdate;

  const onLink = useCallback(
    (link: Link) => {
      return inventoryAPIClient
        .fetch('PUT /internal/inventory/entity/{type}/{displayName}/links', {
          signal,
          params: {
            path: {
              type: entity.type,
              displayName: entity.displayName,
            },
            body: {
              links: entity.links.concat(link),
            },
          },
        })
        .then(() => {
          return onEntityUpdateRef.current();
        });
    },
    [inventoryAPIClient, entity, signal]
  );

  const onUnlink = useCallback(
    ({ asset: { id, type } }: Link) => {
      return inventoryAPIClient
        .fetch('PUT /internal/inventory/entity/{type}/{displayName}/links', {
          signal,
          params: {
            path: {
              type: entity.type,
              displayName: entity.displayName,
            },
            body: {
              links: entity.links.filter((link) => {
                if (link.asset.id === id && link.asset.type === type) {
                  return false;
                }
                return true;
              }),
            },
          },
        })
        .then(() => {
          return onEntityUpdateRef.current();
        });
    },
    [inventoryAPIClient, entity, signal]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EntityLinksTable
        entity={entity}
        identityFields={identityFields}
        linksFetch={linksFetch}
        onUnlink={onUnlink}
      />
      <EuiSpacer />
      <EntitySuggestionsTable entity={entity} identityFields={identityFields} onLink={onLink} />
    </EuiFlexGroup>
  );
}
