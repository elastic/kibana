/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import { Fragment } from 'react';
import React from 'react';

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiNotificationBadge,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
} from '@elastic/eui';

import { AssetTitleMap } from '../../../constants';

import type { SimpleSOAssetType, AllowedAssetTypes } from '../../../../../../../../common';

import { getHrefToObjectInKibanaApp, useStartServices } from '../../../../../hooks';

import { ElasticsearchAssetType, KibanaAssetType } from '../../../../../types';

export type AllowedAssetType = AllowedAssetTypes[number] | 'view';
interface Props {
  type: AllowedAssetType;
  savedObjects: SimpleSOAssetType[];
}

export const AssetsAccordion: FunctionComponent<Props> = ({ savedObjects, type }) => {
  const { http } = useStartServices();

  const isDashboard = type === KibanaAssetType.dashboard;

  return (
    <EuiAccordion
      initialIsOpen={isDashboard}
      buttonContent={
        <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <h3>{AssetTitleMap[type]}</h3>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="subdued" size="m">
              <h3>{savedObjects.length}</h3>
            </EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      id={type}
    >
      <>
        <EuiSpacer size="m" />
        <EuiSplitPanel.Outer hasBorder hasShadow={false}>
          {savedObjects.map(({ id, attributes: { title: soTitle, description } }, idx) => {
            // Ignore custom asset views or if not a Kibana asset
            if (type === 'view') {
              return;
            }

            const pathToObjectInApp = getHrefToObjectInKibanaApp({
              http,
              id,
              type: type === ElasticsearchAssetType.transform ? undefined : type,
            });
            const title = soTitle ?? id;
            return (
              <Fragment key={id}>
                <EuiSplitPanel.Inner grow={false} key={idx}>
                  <EuiText size="m">
                    <p>
                      {pathToObjectInApp ? (
                        <EuiLink href={pathToObjectInApp}>{title}</EuiLink>
                      ) : (
                        title
                      )}
                    </p>
                  </EuiText>
                  {description && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiText size="s" color="subdued">
                        <p>{description}</p>
                      </EuiText>
                    </>
                  )}
                </EuiSplitPanel.Inner>
                {idx + 1 < savedObjects.length && <EuiHorizontalRule margin="none" />}
              </Fragment>
            );
          })}
        </EuiSplitPanel.Outer>
      </>
    </EuiAccordion>
  );
};
