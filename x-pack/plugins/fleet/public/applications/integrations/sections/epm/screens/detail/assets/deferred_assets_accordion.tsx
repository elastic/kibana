/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent, MouseEvent } from 'react';

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiSpacer,
  EuiText,
  EuiHorizontalRule,
  EuiNotificationBadge,
  EuiCallOut,
  EuiTitle,
  EuiButton,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { AssetTitleMap } from '../../../constants';

import { ElasticsearchAssetType } from '../../../../../types';

import type { AssetSavedObject } from './types';

interface Props {
  type: ElasticsearchAssetType.transform;
  deferredInstallations: AssetSavedObject[];
}

export const getDeferredAssetDescription = (assetType: string, assetCount: number) => {
  switch (assetType) {
    case ElasticsearchAssetType.transform:
      return i18n.translate(
        'xpack.fleet.epm.packageDetails.assets.deferredTransformInstallationsCallout',
        {
          defaultMessage:
            '{assetCount, plural, one {# One transform was installed but requires} other {# transforms were installed but require}} additional permissions to run. Re-authorize from a user with `transform_admin` permission to start operations.',
          values: { assetCount: assetCount ?? 1 },
        }
      );
    default:
      return i18n.translate('xpack.fleet.epm.packageDetails.assets.deferredInstallationsCallout', {
        defaultMessage: 'Asset requires additional permissions.',
      });
  }
};

export const DeferredAssetsAccordion: FunctionComponent<Props> = ({
  type,
  deferredInstallations,
}) => {
  const savedObjects = deferredInstallations.map((i) => ({
    id: i.id,
    attributes: {
      title: i.id,
      description: i._version,
    },
  }));

  return (
    <>
      <EuiTitle>
        <h2>
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.assets.deferredInstallationsLabel"
            defaultMessage="Deferred installations"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiCallOut
        size="m"
        color="warning"
        iconType="alert"
        title={i18n.translate(
          'xpack.fleet.epm.packageDetails.assets.deferredInstallationsCallout',
          {
            defaultMessage:
              'This package has {numOfDeferredInstallations, plural, one {# a deferred installation} other {# deferred installations}} which might require additional permissions to install and operate correctly.',
            values: { numOfDeferredInstallations: deferredInstallations.length },
          }
        )}
      />
      <EuiSpacer size="l" />

      <EuiAccordion
        initialIsOpen={true}
        buttonContent={
          <EuiFlexGroup
            justifyContent="center"
            alignItems="center"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="m">
                <h3>{AssetTitleMap[type]}</h3>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge color="accent" size="m">
                <h3>{savedObjects.length}</h3>
              </EuiNotificationBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        id={type}
      >
        <>
          <EuiSpacer size="m" />
          <EuiText>
            <p>{getDeferredAssetDescription(type, deferredInstallations.length)}</p>
            <EuiButton
              size={'m'}
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
              }}
            >
              {i18n.translate('xpack.fleet.epm.packageDetails.assets.reauthorizeButton', {
                defaultMessage: 'Re-authorize all',
              })}
            </EuiButton>
          </EuiText>

          <EuiSpacer size="m" />

          <EuiSplitPanel.Outer hasBorder hasShadow={false}>
            {savedObjects.map(({ id, attributes: { title, description } }, idx) => {
              return (
                <>
                  <EuiSplitPanel.Inner grow={false} key={idx}>
                    <EuiFlexGroup>
                      <EuiFlexItem grow={8}>
                        <EuiText size="m">
                          <p>{title}</p>
                        </EuiText>
                        {description && (
                          <>
                            <EuiSpacer size="s" />
                            <EuiText size="s" color="subdued">
                              <p>{description}</p>
                            </EuiText>
                          </>
                        )}
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiButton
                          size={'s'}
                          onClick={(e: MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                          }}
                        >
                          {i18n.translate(
                            'xpack.fleet.epm.packageDetails.assets.reauthorizeButton',
                            {
                              defaultMessage: 'Re-authorize',
                            }
                          )}
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiSplitPanel.Inner>
                  {idx + 1 < savedObjects.length && <EuiHorizontalRule margin="none" />}
                </>
              );
            })}
          </EuiSplitPanel.Outer>
        </>
      </EuiAccordion>
    </>
  );
};
