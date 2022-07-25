/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import type { Embeddable } from '@kbn/lens-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
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

import { convertLensToADJob } from '../../../application/jobs/new_job/job_from_lens';
import type { LayerResult } from '../../../application/jobs/new_job/job_from_lens';
import { CREATED_BY_LABEL } from '../../../../common/constants/new_job';
import { extractErrorMessage } from '../../../../common/util/errors';

interface Props {
  layerResults: LayerResult[];
  embeddable: Embeddable;
  share: SharePluginStart;
  onClose: () => void;
}

export const FlyoutBody: FC<Props> = ({ onClose, layerResults, embeddable, share }) => {
  function createADJob(layerIndex: number) {
    convertLensToADJob(embeddable, share, layerIndex);
  }

  return (
    <>
      {layerResults.map((layer, i) => (
        <React.Fragment key={layer.id}>
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
                  <EuiFlexGroup gutterSize="s" data-test-subj="mlLensLayerCompatible">
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
                  <EuiButton
                    onClick={createADJob.bind(null, i)}
                    size="s"
                    color="success"
                    iconType="popout"
                    iconSide="right"
                    data-test-subj={`mlLensLayerCompatibleButton_${i}`}
                  >
                    <FormattedMessage
                      id="xpack.ml.embeddables.lensLayerFlyout.createJobButton"
                      defaultMessage="Create job from this layer"
                    />
                  </EuiButton>
                </>
              ) : (
                <>
                  <EuiFlexGroup
                    gutterSize="s"
                    color="subdued"
                    data-test-subj="mlLensLayerIncompatible"
                  >
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
        </React.Fragment>
      ))}
    </>
  );
};
