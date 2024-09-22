/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CriteriaWithPagination,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { compact } from 'lodash';
import React, { useMemo, useRef, useState } from 'react';
import { AbortableAsyncState } from '@kbn/observability-ai-assistant-plugin/public';
import type { Asset } from '../../../common/assets';
import type { Entity, EntityLink, IdentityField } from '../../../common/entities';
import { useAssetLocators } from '../../hooks/use_asset_locators';
import { useKibana } from '../../hooks/use_kibana';
import { getHrefForAsset, getIconForAssetType, getLabelForAssetType } from '../../util/assets';
import { ActionButton } from '../action_button';
import { Link } from '../../../common/links';

interface LinkRow {
  asset: Asset;
  icon: string;
  href: string;
}

export function EntityLinksTable({
  entity,
  linksFetch,
  identityFields,
  onUnlink,
}: {
  entity: Entity;
  linksFetch: AbortableAsyncState<EntityLink[]>;
  identityFields: IdentityField[];
  onUnlink: (link: Link) => Promise<void>;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { dashboardLocator } = useAssetLocators();

  const {
    core: {
      http: { basePath },
    },
  } = useKibana();

  const onUnlinkRef = useRef(onUnlink);
  onUnlinkRef.current = onUnlink;

  const linksWithHrefs = useAbortableAsync(async () => {
    return compact(
      await Promise.all(
        linksFetch?.value?.map(async (link) =>
          link.asset
            ? {
                asset: link.asset,
                icon: getIconForAssetType(link.asset.type),
                href: await getHrefForAsset({
                  asset: link.asset,
                  dashboardLocator,
                  entity,
                  identityFields,
                  basePath,
                }),
              }
            : undefined
        ) ?? []
      )
    );
  }, [linksFetch?.value, entity, identityFields, basePath, dashboardLocator]);

  const columns = useMemo((): Array<EuiBasicTableColumn<LinkRow>> => {
    return [
      {
        name: i18n.translate('xpack.inventory.entityLinksTable.assetType', {
          defaultMessage: 'Type',
        }),
        field: 'type',
        width: '128px',
        render: (_, { icon, asset: { type } }) => {
          return (
            <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
              <EuiIcon size="s" type={icon} />
              <EuiBadge color="hollow">{getLabelForAssetType(type)}</EuiBadge>
            </EuiFlexGroup>
          );
        },
      },
      {
        name: i18n.translate('xpack.inventory.entityLinksTable.assetDisplayName', {
          defaultMessage: 'Name',
        }),
        field: 'displayName',
        render: (_, { href, asset: { displayName } }) => {
          return (
            <EuiLink href={href} data-test-subj="inventoryColumnsLink">
              {displayName}
            </EuiLink>
          );
        },
      },
      {
        name: i18n.translate('xpack.inventory.entityLinksTable.assetSuggestionActions', {
          defaultMessage: 'Actions',
        }),
        width: '128px',
        render: ({ asset: { id, type } }: LinkRow) => {
          return (
            <ActionButton
              data-test-subj="inventoryColumnsUnlinkButton"
              onClick={() => {
                return onUnlinkRef
                  .current({
                    type: 'asset',
                    asset: {
                      id,
                      type,
                    },
                  })
                  .finally(() => {
                    return linksFetch.refresh();
                  });
              }}
              size="s"
              iconType="unlink"
              color="text"
            >
              {i18n.translate(
                'xpack.inventory.entityLinksTable.assetSuggestionActions.unlinkButtonLabel',
                {
                  defaultMessage: 'Unlink',
                }
              )}
            </ActionButton>
          );
        },
      },
    ];
  }, [linksFetch]);

  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiIcon type="link" />
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.inventory.entityAssetView.entityLinks.panelTitle', {
                defaultMessage: 'Linked assets',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexGroup>
        <EuiBasicTable<LinkRow>
          columns={columns}
          items={linksWithHrefs.value ?? []}
          compressed={false}
          loading={linksFetch.loading}
          onChange={(criteria: CriteriaWithPagination<LinkRow>) => {
            setPageIndex(criteria.page.index);
            setPageSize(criteria.page.size);
          }}
          pagination={{
            pageIndex,
            pageSize,
            totalItemCount: linksWithHrefs.value?.length ?? 0,
          }}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
