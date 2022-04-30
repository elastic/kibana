/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiDescriptionList,
  EuiNotificationBadge,
  EuiLink,
  EuiPortal,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';

import { euiStyled } from '../../../../../../../../../../../src/plugins/kibana_react/common';

import type {
  PackageInfo,
  PackageSpecCategory,
  AssetTypeToParts,
  KibanaAssetType,
} from '../../../../../types';
import { entries } from '../../../../../types';
import { useGetCategories } from '../../../../../hooks';
import { AssetTitleMap, DisplayedAssets, ServiceTitleMap } from '../../../constants';

import {
  withSuspense,
  LazyReplacementCard,
} from '../../../../../../../../../../../src/plugins/custom_integrations/public';

import { NoticeModal } from './notice_modal';

const ReplacementCard = withSuspense(LazyReplacementCard);

interface Props {
  packageInfo: PackageInfo;
}

const Replacements = euiStyled(EuiFlexItem)`
  margin: 0;

  & .euiAccordion {
    padding-top: ${({ theme }) => parseInt(theme.eui.euiSizeL, 10) * 2}px;

    &::before {
      content: '';
      display: block;
      border-top: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
      position: relative;
      top: -${({ theme }) => theme.eui.euiSizeL};
      margin: 0 ${({ theme }) => theme.eui.euiSizeXS};
    }
  }
`;

export const Details: React.FC<Props> = memo(({ packageInfo }) => {
  const { data: categoriesData, isLoading: isLoadingCategories } = useGetCategories();
  const packageCategories: string[] = useMemo(() => {
    if (!isLoadingCategories && categoriesData && categoriesData.response) {
      return categoriesData.response
        .filter((category) => packageInfo.categories?.includes(category.id as PackageSpecCategory))
        .map((category) => category.title);
    }
    return [];
  }, [categoriesData, isLoadingCategories, packageInfo.categories]);

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const toggleNoticeModal = useCallback(() => {
    setIsNoticeModalOpen(!isNoticeModalOpen);
  }, [isNoticeModalOpen]);

  const listItems = useMemo(() => {
    // Base details: version and categories
    const items: EuiDescriptionListProps['listItems'] = [
      {
        title: (
          <EuiTextColor color="subdued">
            <FormattedMessage id="xpack.fleet.epm.versionLabel" defaultMessage="Version" />
          </EuiTextColor>
        ),
        description: packageInfo.version,
      },
      {
        title: (
          <EuiTextColor color="subdued">
            <FormattedMessage id="xpack.fleet.epm.categoryLabel" defaultMessage="Category" />
          </EuiTextColor>
        ),
        description: packageCategories.join(', '),
      },
    ];

    // Asset details and counts
    entries(packageInfo.assets).forEach(([service, typeToParts]) => {
      // Filter out assets we are not going to display
      // (currently we only display Kibana and Elasticsearch assets)
      const filteredTypes: AssetTypeToParts = entries(typeToParts).reduce(
        (acc: any, [asset, value]) => {
          if (DisplayedAssets[service].includes(asset)) acc[asset] = value;
          return acc;
        },
        {}
      );
      if (Object.entries(filteredTypes).length) {
        items.push({
          title: (
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="xpack.fleet.epm.assetGroupTitle"
                defaultMessage="{assetType} assets"
                values={{
                  assetType: ServiceTitleMap[service],
                }}
              />
            </EuiTextColor>
          ),
          description: (
            <EuiFlexGroup direction="column" gutterSize="xs">
              {entries(filteredTypes).map(([_type, parts], index) => {
                const type = _type as KibanaAssetType;
                return (
                  <EuiFlexItem key={`item-${index}`}>
                    <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="spaceBetween">
                      <EuiFlexItem grow={false}>{AssetTitleMap[type]}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiNotificationBadge color="subdued">{parts.length}</EuiNotificationBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          ),
        });
      }
    });

    // Feature (data stream type) details
    const dataStreamTypes = [
      ...new Set(packageInfo.data_streams?.map((dataStream) => dataStream.type) || []),
    ];
    if (dataStreamTypes.length) {
      items.push({
        title: (
          <EuiTextColor color="subdued">
            <FormattedMessage id="xpack.fleet.epm.featuresLabel" defaultMessage="Features" />
          </EuiTextColor>
        ),
        description: dataStreamTypes.join(', '),
      });
    }

    // License details
    if (packageInfo.license || packageInfo.notice) {
      items.push({
        title: (
          <EuiTextColor color="subdued">
            <FormattedMessage id="xpack.fleet.epm.licenseLabel" defaultMessage="License" />
          </EuiTextColor>
        ),
        description: (
          <>
            <p>{packageInfo.license}</p>
            {packageInfo.notice && (
              <p>
                <EuiLink onClick={toggleNoticeModal}>NOTICE.txt</EuiLink>
              </p>
            )}
          </>
        ),
      });
    }

    return items;
  }, [
    packageCategories,
    packageInfo.assets,
    packageInfo.data_streams,
    packageInfo.license,
    packageInfo.notice,
    packageInfo.version,
    toggleNoticeModal,
  ]);

  return (
    <>
      <EuiPortal>
        {isNoticeModalOpen && packageInfo.notice && (
          <NoticeModal noticePath={packageInfo.notice} onClose={toggleNoticeModal} />
        )}
      </EuiPortal>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText>
            <h4>
              <FormattedMessage id="xpack.fleet.epm.detailsTitle" defaultMessage="Details" />
            </h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiDescriptionList type="column" compressed listItems={listItems} />
        </EuiFlexItem>
        <Replacements>
          <ReplacementCard eprPackageName={packageInfo.name} />
        </Replacements>
      </EuiFlexGroup>
    </>
  );
});
