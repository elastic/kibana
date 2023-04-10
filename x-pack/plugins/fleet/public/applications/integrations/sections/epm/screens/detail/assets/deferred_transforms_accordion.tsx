/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
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
}

export const getDeferredAssetDescription = (assetType: string, assetCount: number) => {
  switch (assetType) {
    case ElasticsearchAssetType.transform:
      return i18n.translate(
        'xpack.fleet.epm.packageDetails.assets.deferredTransformInstallationsDescription',
        {
          defaultMessage:
            '{assetCount, plural, one {Transform was installed but requires} other {# transforms were installed but require}} additional permissions to run. Reauthorize from a user with transform_admin built-in role or manage_transform cluster privileges to start operations.',
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

  const [transformsToAuthorize, setTransformsToAuthorize] = useState<Array<{
    transformId: string;
  }> | null>(null);

  useEffect(() => {
    async function authorizeTransforms(transformIds: Array<{ transformId: string }>) {
      setIsLoading(true);

      try {
        notifications.toasts.addInfo(
          i18n.translate('xpack.fleet.epm.packageDetails.assets.authorizeTransformsAcknowledged', {
            defaultMessage:
              'Request to authorize {count, plural, one {# transform} other {# transforms}} acknowledged.',
            values: { count: transformIds.length },
          }),
          { toastLifeTimeMs: 500 }
        );

        const resp = await sendRequestReauthorizeTransforms(
          packageInfo.name,
          packageInfo.version,
          transformIds
        );
        if (Array.isArray(resp.data)) {
          const error = resp.data.find((d) => d.error)?.error;

          const cntAuthorized = resp.data.filter((d) => d.success).length;
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
        }
      }
      setIsLoading(false);
    }

    if (transformsToAuthorize && transformsToAuthorize.length > 0) {
      authorizeTransforms(transformsToAuthorize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformsToAuthorize]);

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
        <EuiToolTip
          content={getDeferredAssetDescription(type, deferredInstallations.length)}
          data-test-subject={`fleetAssetsReauthorizeAllTooltip-${isLoading}`}
        >
          <EuiButton
            isLoading={isLoading}
            disabled={!canReauthorizeTransforms}
            size={'m'}
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              setTransformsToAuthorize(deferredTransforms.map((t) => ({ transformId: t.id })));
            }}
            aria-label={getDeferredAssetDescription(type, deferredInstallations.length)}
          >
            {i18n.translate('xpack.fleet.epm.packageDetails.assets.reauthorizeAllButton', {
              defaultMessage: 'Reauthorize all',
            })}
          </EuiButton>
        </EuiToolTip>

        <EuiSpacer size="m" />

        <EuiSplitPanel.Outer hasBorder hasShadow={false}>
          {deferredTransforms.map(({ id: transformId }, idx) => {
            return (
              <>
                <EuiSplitPanel.Inner grow={false} key={`${transformId}-${idx}`}>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={8}>
                      <EuiText size="m">
                        <p>{transformId}</p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiToolTip
                        content={getDeferredAssetDescription(type, 1)}
                        data-test-subject={`fleetAssetsReauthorizeTooltip-${transformId}-${isLoading}`}
                      >
                        <EuiButton
                          isLoading={isLoading}
                          disabled={!canReauthorizeTransforms}
                          size={'s'}
                          onClick={(e: MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            setTransformsToAuthorize([{ transformId }]);
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
              </>
            );
          })}
        </EuiSplitPanel.Outer>
      </>
    </EuiAccordion>
  );
};
