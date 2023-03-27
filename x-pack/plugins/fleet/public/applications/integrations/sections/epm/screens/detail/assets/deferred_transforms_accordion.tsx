/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
  EuiButton,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  sendRequestReauthorizeTransforms,
  useAuthz,
  useStartServices,
} from '../../../../../../../hooks';

import { AssetTitleMap } from '../../../constants';

import type { PackageInfo } from '../../../../../types';
import { ElasticsearchAssetType } from '../../../../../types';

import type { AssetSavedObject } from './types';

interface Props {
  packageInfo: PackageInfo;

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

export const DeferredTransformAccordion: FunctionComponent<Props> = ({
  packageInfo,
  type,
  deferredInstallations,
}) => {
  const { notifications } = useStartServices();
  // const [deferredTransforms, setDeferredTransforms] = useState({status: }

  const [deferredTransforms, setDeferredTransforms] = useState(
    deferredInstallations.map((i) => ({
      id: i.id,
      attributes: {
        title: i.id,
        description: i._version,
      },
    }))
  );
  const canReauthorizeTransforms =
    useAuthz().packagePrivileges?.transform?.actions?.canStartStopTransform.executePackageAction ??
    false;

  const handleAuthorizeTransforms = async (transformIds: Array<{ transformId: string }>) => {
    try {
      notifications.toasts.addInfo(
        i18n.translate('xpack.fleet.epm.packageDetails.assets.authorizeTransformsAcknowledged', {
          defaultMessage:
            'Request to authorize {count, plural, one {# transform} other {# transforms}} acknowledged.',
          values: { count: deferredTransforms.length },
        }),
        { toastLifeTimeMs: 500 }
      );

      const resp = await sendRequestReauthorizeTransforms(
        packageInfo.name,
        packageInfo.version,
        transformIds
      );
      if (Array.isArray(resp.data)) {
        const cntAuthorized = resp.data.filter((d) => d.success).length;
        notifications.toasts.addSuccess(
          i18n.translate('xpack.fleet.epm.packageDetails.assets.authorizeTransformsSuccessful', {
            defaultMessage:
              'Successfully authorized {count, plural, one {# transform} other {# transforms}}.',
            values: { count: cntAuthorized },
          }),
          { toastLifeTimeMs: 500 }
        );
      }
    } catch (e) {
      if (e) {
        notifications.toasts.addError(e, {
          title: i18n.translate(
            'xpack.fleet.epm.packageDetails.assets.unableToAuthorizeAllTransformsError',
            {
              defaultMessage: 'An error occurred authorizing and starting transforms.',
            }
          ),
        });
      }
    }
  };

  const handleAuthorizeAll = async () => {
    handleAuthorizeTransforms(deferredTransforms.map((t) => ({ transformId: t.attributes.title })));
  };

  if (deferredTransforms.length === 0) return null;
  return (
    <EuiAccordion
      initialIsOpen={true}
      buttonContent={
        <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <h3>{AssetTitleMap[type]}</h3>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="accent" size="m">
              <h3>{deferredTransforms.length}</h3>
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
            disabled={!canReauthorizeTransforms}
            size={'m'}
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              handleAuthorizeAll();
            }}
          >
            {i18n.translate('xpack.fleet.epm.packageDetails.assets.reauthorizeButton', {
              defaultMessage: 'Re-authorize all',
            })}
          </EuiButton>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiSplitPanel.Outer hasBorder hasShadow={false}>
          {deferredTransforms.map(
            ({ id: transformId, attributes: { title, description } }, idx) => {
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
                          disabled={!canReauthorizeTransforms}
                          size={'s'}
                          onClick={(e: MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            handleAuthorizeTransforms([{ transformId }]);
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
                  {idx + 1 < deferredTransforms.length && <EuiHorizontalRule margin="none" />}
                </>
              );
            }
          )}
        </EuiSplitPanel.Outer>
      </>
    </EuiAccordion>
  );
};
