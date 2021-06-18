/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { EuiText, EuiToolTip, EuiButtonEmpty } from '@elastic/eui';

import { EuiLinkTo } from '../../../../shared/react_router_helpers';
import { ENGINE_SCHEMA_PATH } from '../../../routes';
import { generateEncodedPath } from '../../../utils/encode_path_params';

interface Props {
  engines?: string[];
  cutoff?: number;
}

export const TruncatedEnginesList: React.FC<Props> = ({ engines, cutoff = 3 }) => {
  if (!engines?.length) return null;

  const displayedEngines = engines.slice(0, cutoff);
  const hiddenEngines = engines.slice(cutoff);
  const SEPARATOR = ', ';

  return (
    <EuiText size="s">
      {displayedEngines.map((engineName, i) => {
        const isLast = i === displayedEngines.length - 1;
        return (
          <Fragment key={engineName}>
            <EuiLinkTo
              to={generateEncodedPath(ENGINE_SCHEMA_PATH, { engineName })}
              data-test-subj="displayedEngine"
            >
              {engineName}
            </EuiLinkTo>
            {!isLast ? SEPARATOR : ''}
          </Fragment>
        );
      })}
      {hiddenEngines.length > 0 && (
        <>
          {SEPARATOR}
          <EuiToolTip
            position="bottom"
            content={hiddenEngines.join(SEPARATOR)}
            data-test-subj="hiddenEnginesTooltip"
          >
            <EuiButtonEmpty size="xs" flush="both">
              +{hiddenEngines.length}
            </EuiButtonEmpty>
          </EuiToolTip>
        </>
      )}
    </EuiText>
  );
};
