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
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { useKibana } from '../../hooks/use_kibana';
import type { Entity, IdentityField } from '../../../common/entities';
import type { AssetSuggestion } from '../../../common/assets';
import { getHrefForAsset, getIconForAssetType, getLabelForAssetType } from '../../util/assets';
import { useAssetLocators } from '../../hooks/use_asset_locators';
import { ActionButton } from '../action_button';
import { Link } from '../../../common/links';

export function EntitySuggestionsTable({
  entity,
  identityFields,
  onLink,
}: {
  entity: Entity;
  identityFields: IdentityField[];
  onLink: (link: Link) => Promise<void>;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { dashboardLocator } = useAssetLocators();

  const {
    core: {
      http: { basePath },
    },
    dependencies: {
      start: { data },
    },
    services: { inventoryAPIClient },
  } = useKibana();

  const {
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

  const suggestionsFetch = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient
        .fetch('POST /internal/inventory/assets/entity/suggestions', {
          signal,
          params: {
            body: {
              start,
              end,
              entity: {
                type: entity.type,
                displayName: entity.displayName,
              },
            },
          },
        })
        .then(async ({ suggestions }) => {
          return await Promise.all(
            suggestions.map(async (suggestion) => ({
              ...suggestion,
              icon: getIconForAssetType(suggestion.asset.type),
              href: await getHrefForAsset({
                asset: suggestion.asset,
                dashboardLocator,
                entity,
                identityFields,
                basePath,
              }),
            }))
          );
        });
    },
    [entity, start, end, inventoryAPIClient, identityFields, dashboardLocator, basePath]
  );

  const suggestions = useMemo(() => {
    return suggestionsFetch.value ?? [];
  }, [suggestionsFetch.value]);

  const onLinkRef = useRef(onLink);
  onLinkRef.current = onLink;

  const columns = useMemo((): Array<
    EuiBasicTableColumn<AssetSuggestion & { icon: string; href: string }>
  > => {
    return [
      {
        name: i18n.translate('xpack.inventory.entityAssetView.assetType', {
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
        name: i18n.translate('xpack.inventory.entityAssetView.assetDisplayName', {
          defaultMessage: 'Name',
        }),
        field: 'displayName',
        render: (_, { href, description, asset: { displayName } }) => {
          return (
            <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
              <EuiLink href={href} data-test-subj="inventoryColumnsLink">
                {displayName}
              </EuiLink>
              <EuiText size="xs" color="subdued">
                {description}
              </EuiText>
            </EuiFlexGroup>
          );
        },
      },
      {
        name: i18n.translate('xpack.inventory.entityAssetView.assetSuggestionActions', {
          defaultMessage: 'Actions',
        }),
        width: '128px',
        render: ({ asset }: AssetSuggestion) => {
          return (
            <ActionButton
              data-test-subj="inventoryColumnsLinkButton"
              onClick={() => {
                return onLinkRef
                  .current({
                    asset: {
                      id: asset.id,
                      type: asset.type,
                    },
                    type: 'asset',
                  })
                  .finally(() => {
                    suggestionsFetch.refresh();
                  });
              }}
              size="s"
              iconType="link"
            >
              {i18n.translate('xpack.inventory.columns.linkButtonLabel', {
                defaultMessage: 'Link',
              })}
            </ActionButton>
          );
        },
      },
    ];
  }, [suggestionsFetch]);

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexGroup direction="row" alignItems="center">
          <EuiIcon type="sparkles" />
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.inventory.entityAssetView.entitySuggestions.panelTitle', {
                defaultMessage: 'Suggested assets',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexGroup>
        <EuiText color="subdued" size="s">
          {i18n.translate('xpack.inventory.entityAssetView.entitySuggestions.panelDescription', {
            defaultMessage: `These assets might be related to this {type}. By linking them to
            the {type}, they'll show up in your quick links and any produced signals from the
            related assets will be associated to this entity.`,
            values: { type: entity.type },
          })}
        </EuiText>
      </EuiFlexGroup>
      <EuiBasicTable<AssetSuggestion & { icon: string; href: string }>
        columns={columns}
        items={suggestions}
        compressed={false}
        loading={suggestionsFetch.loading}
        onChange={(
          criteria: CriteriaWithPagination<AssetSuggestion & { icon: string; href: string }>
        ) => {
          setPageIndex(criteria.page.index);
          setPageSize(criteria.page.size);
        }}
        pagination={{
          pageIndex,
          pageSize,
          totalItemCount: suggestions.length,
        }}
      />
    </EuiPanel>
  );
}
