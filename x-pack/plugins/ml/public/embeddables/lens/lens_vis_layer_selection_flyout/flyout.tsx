/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import type { Embeddable } from '@kbn/lens-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { FlyoutBody } from './flyout_body';

interface Props {
  embeddable: Embeddable;
  data: DataPublicPluginStart;
  share: SharePluginStart;
  lens: LensPublicStart;
  onClose: () => void;
}

export const LensLayerSelectionFlyout: FC<Props> = ({ onClose, embeddable, data, share, lens }) => {
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.ml.embeddables.lensLayerFlyout.title"
              defaultMessage="Create anomaly detection job"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ml.embeddables.lensLayerFlyout.secondTitle"
            defaultMessage="Select a compatible layer from the visualization to create an anomaly detection job."
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody className="mlLensToJobFlyoutBody">
        <FlyoutBody
          onClose={onClose}
          embeddable={embeddable}
          data={data}
          share={share}
          lens={lens}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ml.embeddables.lensLayerFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
