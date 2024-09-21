/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiFlexGroup,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { Entity, IdentityField } from '../../../common/entities';
import { Asset, AssetSuggestion, AssetType } from '../../../common/assets';
import { getEntitySourceKql } from '../../../common/utils/get_entity_source_kql';
import { useAssetLocators } from '../../hooks/use_asset_locators';

function getIconForAssetType(type: AssetType): string {
  switch (type) {
    case 'dashboard':
      return 'container';
    case 'rule':
      return 'bell';
    case 'sloDefinition':
      return 'temperature';
  }
}

function getLabelForAssetType(type: AssetType): string {
  switch (type) {
    case 'dashboard':
      return i18n.translate('xpack.inventory.assetDetailView.assetTypeDashboard', {
        defaultMessage: 'Dashboard',
      });
    case 'rule':
      return i18n.translate('xpack.inventory.assetDetailView.assetTypeDashboard', {
        defaultMessage: 'Rule',
      });
    case 'sloDefinition':
      return i18n.translate('xpack.inventory.assetDetailView.assetTypeDashboard', {
        defaultMessage: 'SLO',
      });
  }
}

async function getHrefForAsset({
  asset,
  dashboardLocator,
  entity,
  identityFields,
  basePath,
}: {
  asset: Asset;
  dashboardLocator?: LocatorPublic<SerializableRecord>;
  entity: Entity;
  identityFields: IdentityField[];
  basePath: { prepend: (url: string) => string };
}): Promise<string> {
  switch (asset.type) {
    case 'dashboard': {
      const query = getEntitySourceKql({ entity, identityFields });
      const href = await dashboardLocator?.getRedirectUrl({
        dashboardId: asset.id,
        query: query ? { query, language: 'kuery' } : undefined,
      });
      return href ?? '';
    }
    case 'rule':
      return basePath.prepend(
        `/app/management/insightsAndAlerting/triggersActions/rule/${asset.id}`
      );
    case 'sloDefinition':
      return 'temperature';
  }
}

export function EntityAssetView({
  entity,
  identityFields,
}: {
  entity: Entity;
  identityFields: IdentityField[];
}) {
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

  const { dashboardLocator } = useAssetLocators();

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
        render: (_, { href, asset: { displayName } }) => {
          return (
            <EuiLink href={href} data-test-subj="inventoryColumnsLink">
              {displayName}
            </EuiLink>
          );
        },
      },
      {
        name: i18n.translate('xpack.inventory.entityAssetView.assetSuggestionActions', {
          defaultMessage: 'Actions',
        }),
        width: '128px',
        render: ({}) => {
          return (
            <EuiButton
              data-test-subj="inventoryColumnsLinkButton"
              onClick={() => {
                // TODO
              }}
              size="s"
              iconType="link"
            >
              {i18n.translate('xpack.inventory.columns.linkButtonLabel', {
                defaultMessage: 'Link',
              })}
            </EuiButton>
          );
        },
      },
    ];
  }, []);

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column">
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexGroup direction="row" alignItems="center">
            <EuiIcon type="sparkles" />
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.inventory.entityAssetView.suggestedAssetsTitle', {
                  defaultMessage: 'Suggested assets',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexGroup>
          <EuiText color="subdued" size="s">
            {i18n.translate('xpack.inventory.entityAssetView.suggestedAssetsDescription', {
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
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
