/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiHorizontalRule,
  EuiNotificationBadge,
} from '@elastic/eui';

import { AssetTitleMap } from '../../../../../constants';

import { getHrefToObjectInKibanaApp, useStartServices } from '../../../../../hooks';

import type { AllowedAssetType, AssetSavedObject } from './types';

interface Props {
  type: AllowedAssetType;
  savedObjects: AssetSavedObject[];
}

export const AssetsAccordion: FunctionComponent<Props> = ({ savedObjects, type }) => {
  const { http } = useStartServices();
  return (
    <EuiAccordion
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
          {savedObjects.map(({ id, attributes: { title, description } }, idx) => {
            const pathToObjectInApp = getHrefToObjectInKibanaApp({
              http,
              id,
              type,
            });
            return (
              <>
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
              </>
            );
          })}
        </EuiSplitPanel.Outer>
      </>
    </EuiAccordion>
  );
};
