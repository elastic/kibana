/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import { range } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { WhoAmI } from '../containers/who_am_i';

export const VisualizationPlaceholder = styled(EuiPanel)`
  && {
    align-items: center;
    justify-content: center;
    display: flex;
    flex-direction: column;
    margin: 5px;
    padding: 5px 5px 5px 10px;
    width: 500px;
    height: 309px;
    user-select: none;
  }
`;

interface Props {
  count: number;
  myRoute: string;
}

/** TODO: delete this stub */
export const Placeholders = pure<Props>(({ count, myRoute }) => (
  <React.Fragment>
    {range(0, count).map(p => (
      <VisualizationPlaceholder
        data-test-subj="visualizationPlaceholder"
        key={`visualizationPlaceholder-${p}`}
      >
        <WhoAmI data-test-subj="whoAmI" sourceId="default">
          {({ appName }) => (
            <div>
              {appName} {myRoute}
            </div>
          )}
        </WhoAmI>
      </VisualizationPlaceholder>
    ))}
  </React.Fragment>
));
