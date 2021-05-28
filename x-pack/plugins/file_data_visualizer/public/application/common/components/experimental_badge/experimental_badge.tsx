/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';

import { EuiBetaBadge } from '@elastic/eui';

export const ExperimentalBadge: FC<{ tooltipContent: string }> = ({ tooltipContent }) => {
  return (
    <span>
      <EuiBetaBadge
        className="experimental-badge"
        label={
          <FormattedMessage
            id="xpack.fileDataVisualizer.experimentalBadge.experimentalLabel"
            defaultMessage="Experimental"
          />
        }
        tooltipContent={tooltipContent}
      />
    </span>
  );
};
