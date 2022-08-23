/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import type { Embeddable } from '@kbn/lens-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IUiSettingsClient, ApplicationStart } from '@kbn/core/public';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiIcon,
  EuiText,
  EuiSplitPanel,
  EuiHorizontalRule,
} from '@elastic/eui';
import type { LayerResult } from '../../../../application/jobs/new_job/job_from_lens';
import { MlApiServices } from '../../../../application/services/ml_api_service';
import { CompatibleLayer } from './compatible_layer';
import { IncompatibleLayer } from './incompatible_layer';

interface Props {
  layer: LayerResult;
  layerIndex: number;
  embeddable: Embeddable;
  share: SharePluginStart;
  data: DataPublicPluginStart;
  application: ApplicationStart;
  kibanaConfig: IUiSettingsClient;
  mlApiServices: MlApiServices;
}

export const Layer: FC<Props> = ({
  layer,
  layerIndex,
  embeddable,
  share,
  data,
  application,
  mlApiServices,
  kibanaConfig,
}) => {
  return (
    <>
      <EuiSplitPanel.Outer grow>
        <EuiSplitPanel.Inner>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            {layer.icon && (
              <EuiFlexItem grow={false}>
                <EuiIcon type={layer.icon} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow>
              <EuiText color={layer.isCompatible ? '' : 'subdued'}>
                <h5>{layer.label}</h5>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner grow={false} color="subdued">
          {layer.isCompatible ? (
            <CompatibleLayer
              layer={layer}
              layerIndex={layerIndex}
              application={application}
              data={data}
              embeddable={embeddable}
              kibanaConfig={kibanaConfig}
              mlApiServices={mlApiServices}
              share={share}
            />
          ) : (
            <IncompatibleLayer layer={layer} />
          )}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
      <EuiSpacer />
    </>
  );
};
