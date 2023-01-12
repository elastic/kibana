/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { getMitreComponentParts } from '../../../../detections/mitre/get_mitre_threat_component';
import { useEventDetailsPanelContext } from '../event/context';

export const MitreDetails = () => {
  const { searchHit } = useEventDetailsPanelContext();
  const threatDetails = useMemo(() => getMitreComponentParts(searchHit), [searchHit]);
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      css={css`
        flex-wrap: nowrap;
        & .euiFlexGroup {
          flex-wrap: nowrap;
        }
      `}
      direction="column"
      wrap={false}
      gutterSize="none"
    >
      {threatDetails && threatDetails[0] && (
        <>
          <EuiTitle size="xxs">
            <h5>{threatDetails[0].title}</h5>
          </EuiTitle>
          <div
            css={css`
              padding-left: ${euiTheme.size.l};
            `}
          >
            {threatDetails[0].description}
          </div>
        </>
      )}
    </EuiFlexGroup>
  );
};
