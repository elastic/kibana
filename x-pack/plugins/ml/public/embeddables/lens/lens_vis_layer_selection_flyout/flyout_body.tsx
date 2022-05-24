/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useMemo } from 'react';
import type { Embeddable } from '@kbn/lens-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';

import './style.scss';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiIcon,
  EuiText,
  EuiSplitPanel,
  EuiHorizontalRule,
} from '@elastic/eui';

import {
  getLayers,
  getJobsItemsFromEmbeddable,
  convertLensToADJob,
} from '../../../application/jobs/new_job/job_from_lens';
import type { LayerResult } from '../../../application/jobs/new_job/job_from_lens';
import { CREATED_BY_LABEL } from '../../../../common/constants/new_job';
import { extractErrorMessage } from '../../../../common/util/errors';

interface Props {
  embeddable: Embeddable;
  data: DataPublicPluginStart;
  share: SharePluginStart;
  lens: LensPublicStart;
  onClose: () => void;
}

export const FlyoutBody: FC<Props> = ({ onClose, embeddable, data, share, lens }) => {
  const embeddableItems = useMemo(() => getJobsItemsFromEmbeddable(embeddable), [embeddable]);

  const [layerResult, setLayerResults] = useState<LayerResult[]>([]);

  useEffect(() => {
    const { vis } = embeddableItems;

    getLayers(vis, data.dataViews, lens).then((layers) => {
      setLayerResults(layers);
    });
  }, []);

  function createADJob(layerIndex: number) {
    convertLensToADJob(embeddable, share, layerIndex);
  }

  return (
    <>
      {layerResult.map((layer, i) => (
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
                <>
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <EuiIcon type="checkInCircleFilled" color="success" />
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <FormattedMessage
                          id="xpack.ml.embeddables.lensLayerFlyout.createJobCalloutTitle"
                          defaultMessage="This layer can be used to create a {type} job"
                          values={{
                            type:
                              layer.jobWizardType === CREATED_BY_LABEL.MULTI_METRIC
                                ? 'multi-metric'
                                : 'single metric',
                          }}
                        />
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="m" />
                  <EuiButton onClick={createADJob.bind(null, i)} size="s" color="success">
                    <FormattedMessage
                      id="xpack.ml.embeddables.lensLayerFlyout.createJobButton"
                      defaultMessage="Create job from this layer"
                    />{' '}
                    <EuiIcon type="popout" />
                  </EuiButton>
                </>
              ) : (
                <>
                  <EuiFlexGroup gutterSize="s" color="subdued">
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <EuiIcon type="crossInACircleFilled" color="subdued" />
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText color="subdued" size="s">
                        {layer.error ? (
                          extractErrorMessage(layer.error)
                        ) : (
                          <FormattedMessage
                            id="xpack.ml.embeddables.lensLayerFlyout.defaultLayerError"
                            defaultMessage="This layer cannot be used to create an anomaly detection job"
                          />
                        )}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              )}
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
          <EuiSpacer />
        </>
      ))}
    </>
  );
};
