/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useState, useMemo } from 'react';
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
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { ElasticsearchErrorDetails } from '@kbn/es-errors';

import type { EsAssetReference } from '../../../../../../../../common';

import {
  sendRequestReauthorizeTransforms,
  useAuthz,
  useStartServices,
} from '../../../../../../../hooks';

import { AssetTitleMap } from '../../../constants';

import type { PackageInfo } from '../../../../../types';
import { ElasticsearchAssetType } from '../../../../../types';

interface Props {
  packageInfo: PackageInfo;
  type: ElasticsearchAssetType.transform;
  deferredInstallations: EsAssetReference[];
  forceRefreshAssets?: () => void;
}

export const getDeferredAssetDescription = (
  assetType: string,
  assetCount: number,
  permissions: { canReauthorizeTransforms: boolean }
) => {
  switch (assetType) {
    case ElasticsearchAssetType.transform:
      if (permissions.canReauthorizeTransforms) {
        return i18n.translate(
          'xpack.fleet.epm.packageDetails.assets.deferredTransformReauthorizeDescription',
          {
            defaultMessage:
              '{assetCount, plural, one {Transform was installed but requires} other {# transforms were installed but require}} additional permissions to run. Reauthorize the {assetCount, plural, one {transform} other {transforms}} to start operations.',
            values: { assetCount: assetCount ?? 1 },
          }
        );
      }
      return i18n.translate(
        'xpack.fleet.epm.packageDetails.assets.deferredTransformRequestPermissionDescription',
        {
          defaultMessage:
            '{assetCount, plural, one {Transform was installed but requires} other {# transforms were installed but require}} additional permissions to run. Contact your administrator to request the required privileges.',
          values: { assetCount: assetCount ?? 1 },
        }
      );
    default:
      return i18n.translate(
        'xpack.fleet.epm.packageDetails.assets.deferredInstallationsDescription',
        {
          defaultMessage: 'Asset requires additional permissions.',
        }
      );
  }
};

export const DeferredTransformAccordion: FunctionComponent<Props> = ({
  packageInfo,
  type,
  deferredInstallations,
  forceRefreshAssets,
}) => {
  const { notifications } = useStartServices();
  const [isLoading, setIsLoading] = useState(false);
  const deferredTransforms = useMemo(
    () =>
      deferredInstallations.map((i) => ({
        id: i.id,
        attributes: {
          title: i.id,
          description: i.type,
        },
      })),
    [deferredInstallations]
  );

  const canReauthorizeTransforms =
    useAuthz().packagePrivileges?.transform?.actions?.canStartStopTransform?.executePackageAction ??
    false;

  const authorizeTransforms = useCallback(
    async (transformIds: Array<{ transformId: string }>) => {
      setIsLoading(true);
      notifications.toasts.addInfo(
        i18n.translate('xpack.fleet.epm.packageDetails.assets.authorizeTransformsAcknowledged', {
          defaultMessage:
            'Request to authorize {count, plural, one {# transform} other {# transforms}} acknowledged.',
          values: { count: transformIds.length },
        }),
        { toastLifeTimeMs: 500 }
      );

      try {
        const reauthorizeTransformResp = await sendRequestReauthorizeTransforms(
          packageInfo.name,
          packageInfo.version,
          transformIds
        );
        if (reauthorizeTransformResp.error) {
          throw reauthorizeTransformResp.error;
        }
        if (Array.isArray(reauthorizeTransformResp.data)) {
          const error = reauthorizeTransformResp.data.find((d) => d.error)?.error;

          const cntAuthorized = reauthorizeTransformResp.data.filter((d) => d.success).length;
          if (error) {
            const errorBody = error.meta?.body as ElasticsearchErrorDetails;
            const errorMsg = errorBody
              ? `${errorBody.error?.type}: ${errorBody.error?.reason}`
              : `${error.message}`;

            notifications.toasts.addError(
              { name: errorMsg, message: errorMsg },
              {
                title: i18n.translate(
                  'xpack.fleet.epm.packageDetails.assets.authorizeTransformsUnsuccessful',
                  {
                    defaultMessage:
                      'Unable to authorize {cntUnauthorized, plural, one {# transform} other {# transforms}}.',
                    values: { cntUnauthorized: transformIds.length - cntAuthorized },
                  }
                ),
                toastLifeTimeMs: 1000,
              }
            );
          } else {
            notifications.toasts.addSuccess(
              i18n.translate(
                'xpack.fleet.epm.packageDetails.assets.authorizeTransformsSuccessful',
                {
                  defaultMessage:
                    'Successfully authorized {count, plural, one {# transform} other {# transforms}}.',
                  values: { count: cntAuthorized },
                }
              ),
              { toastLifeTimeMs: 1000 }
            );
            if (forceRefreshAssets) {
              forceRefreshAssets();
            }
          }
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
          if (forceRefreshAssets) {
            forceRefreshAssets();
          }
        }
      }
      setIsLoading(false);
    },
    [notifications.toasts, packageInfo.name, packageInfo.version, forceRefreshAssets]
  );
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
          {getDeferredAssetDescription(type, deferredInstallations.length, {
            canReauthorizeTransforms,
          })}{' '}
        </EuiText>
        <EuiSpacer size="m" />

        <EuiButton
          data-test-subject={`fleetAssetsReauthorizeAll`}
          disabled={!canReauthorizeTransforms}
          isLoading={isLoading}
          size={'m'}
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            authorizeTransforms(deferredTransforms.map((t) => ({ transformId: t.id })));
          }}
          aria-label={getDeferredAssetDescription(type, deferredInstallations.length, {
            canReauthorizeTransforms,
          })}
        >
          {i18n.translate('xpack.fleet.epm.packageDetails.assets.reauthorizeAllButton', {
            defaultMessage: 'Reauthorize all',
          })}
        </EuiButton>

        <EuiSpacer size="m" />

        <EuiSplitPanel.Outer hasBorder hasShadow={false}>
          {deferredTransforms.map(({ id: transformId }, idx) => {
            return (
              <Fragment key={transformId}>
                <EuiSplitPanel.Inner grow={false} key={`${transformId}-${idx}`}>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={8}>
                      <EuiText size="m">
                        <p>{transformId}</p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiToolTip
                        content={
                          canReauthorizeTransforms
                            ? undefined
                            : getDeferredAssetDescription(type, 1, { canReauthorizeTransforms })
                        }
                        data-test-subject={`fleetAssetsReauthorizeTooltip-${transformId}-${isLoading}`}
                      >
                        <EuiButton
                          isLoading={isLoading}
                          disabled={!canReauthorizeTransforms}
                          size={'s'}
                          onClick={(e: MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            authorizeTransforms([{ transformId }]);
                          }}
                        >
                          {i18n.translate(
                            'xpack.fleet.epm.packageDetails.assets.reauthorizeButton',
                            {
                              defaultMessage: 'Reauthorize',
                            }
                          )}
                        </EuiButton>
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiSplitPanel.Inner>
                {idx + 1 < deferredTransforms.length && <EuiHorizontalRule margin="none" />}
              </Fragment>
            );
          })}
        </EuiSplitPanel.Outer>
      </>
    </EuiAccordion>
  );
};
