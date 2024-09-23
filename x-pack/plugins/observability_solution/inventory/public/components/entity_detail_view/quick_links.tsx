/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiListGroup,
  EuiListGroupItem,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import React, { useState } from 'react';
import { orderBy } from 'lodash';
import { Entity, EntityLink, IdentityField } from '../../../common/entities';
import { useAssetLocators } from '../../hooks/use_asset_locators';
import { useKibana } from '../../hooks/use_kibana';
import { getHrefForAsset, getIconForAssetType, getLabelForAssetType } from '../../util/assets';
import { EntityDetailViewHeaderSection } from '../entity_detail_view_header_section';

export function QuickLinks({
  entity,
  identityFields,
  links,
}: {
  entity: Entity;
  identityFields: IdentityField[];
  links?: EntityLink[];
}) {
  const {
    core: {
      http: { basePath },
    },
  } = useKibana();

  const { dashboardLocator } = useAssetLocators();

  const quickLinks = useAbortableAsync(async () => {
    const displayedLinks = orderBy(
      links,
      [(link) => (link.asset.type === 'dashboard' ? 1 : -1), (link) => link.asset.displayName],
      ['desc', 'asc']
    );
    return await Promise.all(
      displayedLinks.map(async (link) => {
        return {
          id: link.asset.id,
          icon: getIconForAssetType(link.asset.type),
          type: getLabelForAssetType(link.asset.type),
          href: await getHrefForAsset({
            asset: link.asset,
            basePath,
            entity,
            identityFields,
            dashboardLocator,
          }),
          displayName: link.asset.displayName,
        };
      })
    );
  }, [entity, links, dashboardLocator, identityFields, basePath]);

  const displayedLinks = quickLinks.value?.slice(0, 3) ?? [];
  const moreLinks = quickLinks.value?.slice(3) ?? [];

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EntityDetailViewHeaderSection
      title={
        <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.inventory.entityDetailView.quickLinksSection', {
              defaultMessage: 'Quick links',
            })}
          </EuiFlexItem>

          {moreLinks.length ? (
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiLink
                    data-test-subj="inventoryQuickLinksShowMoreButton"
                    onClick={() => setIsPopoverOpen((prev) => !prev)}
                    color="subdued"
                  >
                    <EuiText size="xs">
                      {i18n.translate(
                        'xpack.inventory.entityDetailView.quickLinksShowMoreButtonLabel',
                        {
                          defaultMessage: 'Show {count} more',
                          values: {
                            count: moreLinks.length,
                          },
                        }
                      )}
                    </EuiText>
                  </EuiLink>
                }
                isOpen={isPopoverOpen}
                closePopover={() => {
                  setIsPopoverOpen(() => false);
                }}
              >
                <EuiListGroup>
                  {moreLinks.map((link) => (
                    <EuiListGroupItem
                      key={link.id}
                      label={
                        <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
                          <EuiBadge color="hollow">{link.type}</EuiBadge>
                          <EuiLink data-test-subj="inventoryQuickLinksLink" href={link.href}>
                            <EuiText size="xs">{link.displayName}</EuiText>
                          </EuiLink>
                        </EuiFlexGroup>
                      }
                    />
                  ))}
                </EuiListGroup>
              </EuiPopover>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      }
    >
      <EuiSpacer size="xs" />
      <EuiFlexGroup direction="column" gutterSize="s">
        {displayedLinks.length ? (
          displayedLinks.map((link) => {
            return (
              <EuiFlexGroup direction="row" alignItems="center" key={link.id} gutterSize="m">
                <EuiBadge color="hollow">{link.type}</EuiBadge>
                <EuiLink data-test-subj="inventoryQuickLinksLink" href={link.href}>
                  <EuiText size="xs">{link.displayName}</EuiText>
                </EuiLink>
              </EuiFlexGroup>
            );
          })
        ) : (
          <EuiText>-</EuiText>
        )}
      </EuiFlexGroup>
    </EntityDetailViewHeaderSection>
  );
}
