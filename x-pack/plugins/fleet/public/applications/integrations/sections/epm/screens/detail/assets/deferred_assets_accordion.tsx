/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';

import { EuiSpacer, EuiCallOut, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import type { PackageInfo } from '../../../../../types';
import { ElasticsearchAssetType } from '../../../../../types';

import { DeferredTransformAccordion } from './deferred_transforms_accordion';

import type { AssetSavedObject } from './types';

interface Props {
  packageInfo: PackageInfo;
  deferredInstallations: AssetSavedObject[];
}

export const DeferredAssetsSection: FunctionComponent<Props> = ({
  deferredInstallations,
  packageInfo,
}) => {
  const deferredTransforms = deferredInstallations.filter(
    (asset) => asset.type === ElasticsearchAssetType.transform
  );
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

      <DeferredTransformAccordion
        packageInfo={packageInfo}
        type={ElasticsearchAssetType.transform}
        deferredInstallations={deferredTransforms}
      />
    </>
  );
};
