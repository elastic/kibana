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
  EuiCallOut,
  EuiTitle,
  EuiButton,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { AssetTitleMap } from '../../../constants';

import { getHrefToObjectInKibanaApp, useStartServices } from '../../../../../hooks';

import type { ElasticsearchAssetType } from '../../../../../types';

import type { AssetSavedObject } from './types';

interface Props {
  type: ElasticsearchAssetType.transform;
  deferredInstallations: AssetSavedObject[];
}

export const DeferredAssetsAccordion: FunctionComponent<Props> = ({
  type,
  deferredInstallations,
}) => {
  const savedObjects = deferredInstallations.map((i) => ({
    id: i.id,
    attributes: {
      title: i.id,
      description: 'Transform was installed but requires additional permissions to run.',
    },
  }));
  const { http } = useStartServices();

  return (
    <>
      <EuiCallOut
        size="s"
        color="warning"
        iconType="alert"
        title={i18n.translate('xpack.fleet.agentReassignPolicy.packageBadgeFleetServerWarning', {
          defaultMessage:
            'This package has {numOfDeferredInstallations} deferred installations. They might require additional permissions to install and operate correctly.',
          values: { numOfDeferredInstallations: deferredInstallations.length },
        })}
      />
      <EuiSpacer size="l" />

      <EuiTitle>
        <h2>
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.assets.noAssetsFoundLabel"
            defaultMessage="Deferred installations"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />

      <EuiAccordion
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
              // Ignore custom asset views
              if (type === 'view') {
                return;
              }

              const pathToObjectInApp = getHrefToObjectInKibanaApp({
                http,
                id,
                type,
              });
              return (
                <>
                  <EuiSplitPanel.Inner grow={false} key={idx}>
                    {/* <EuiFlexGrid>*/}
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
                    <EuiButton
                      size={'m'}
                      onClick={(e) => {
                        e.preventDefault();
                      }}
                    >
                      Authorize
                    </EuiButton>
                    {/* </EuiFlexGrid>*/}
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
