/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import {
  ISOLATE_HOST,
  UNISOLATE_HOST,
} from '../../../../../common/components/endpoint/host_isolation';
import { ALERT_DETAILS, TECHNICAL_PREVIEW, TECHNICAL_PREVIEW_DESCRIPTION } from '../translations';

const BackToAlertDetailsLinkComponent = ({
  showAlertDetails,
  showExperimentalBadge,
  isolateAction,
}: {
  showAlertDetails: () => void;
  showExperimentalBadge?: boolean;
  isolateAction: 'isolateHost' | 'unisolateHost';
}) => (
  <>
    <EuiButtonEmpty iconType="arrowLeft" iconSide="left" flush="left" onClick={showAlertDetails}>
      <EuiText size="xs">
        <p>{ALERT_DETAILS}</p>
      </EuiText>
    </EuiButtonEmpty>
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <h2>{isolateAction === 'isolateHost' ? ISOLATE_HOST : UNISOLATE_HOST}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {showExperimentalBadge && (
          <EuiBetaBadge
            css={css`
              display: inline-flex;
            `}
            label={TECHNICAL_PREVIEW}
            size="s"
            tooltipContent={TECHNICAL_PREVIEW_DESCRIPTION}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

const BackToAlertDetailsLink = React.memo(BackToAlertDetailsLinkComponent);

export { BackToAlertDetailsLink };
