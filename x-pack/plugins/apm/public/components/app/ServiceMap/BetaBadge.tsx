/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';

const BetaBadgeContainer = styled.div`
  right: ${({ theme }) => theme.eui.gutterTypes.gutterMedium};
  position: absolute;
  top: ${({ theme }) => theme.eui.gutterTypes.gutterSmall};
  z-index: 1; /* The element containing the cytoscape canvas has z-index = 0. */
`;

export function BetaBadge() {
  return (
    <BetaBadgeContainer>
      <EuiBetaBadge
        label={i18n.translate('xpack.apm.serviceMap.betaBadge', {
          defaultMessage: 'Beta',
        })}
        tooltipContent={i18n.translate(
          'xpack.apm.serviceMap.betaTooltipMessage',
          {
            defaultMessage:
              'This feature is currently in beta. If you encounter any bugs or have feedback, please open an issue or visit our discussion forum.',
          }
        )}
      />
    </BetaBadgeContainer>
  );
}
