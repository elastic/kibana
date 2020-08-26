/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiAccordion } from '@elastic/eui';
import PropTypes from 'prop-types';
import React from 'react';
import { ComponentStrings } from '../../../i18n';
import { State } from '../../../types';

const { ElementConfig: strings } = ComponentStrings;

interface Props {
  elementStats: State['transient']['elementStats'];
}

export const ElementConfig = ({ elementStats }: Props) => {
  if (!elementStats) {
    return null;
  }

  const { total, ready, error } = elementStats;
  const progress = total > 0 ? Math.round(((ready + error) / total) * 100) : 100;

  return (
    <div className="canvasSidebar__expandable">
      <EuiAccordion
        id="canvas-element-stats"
        buttonContent={strings.getTitle()}
        initialIsOpen={false}
        className="canvasSidebar__accordion"
      >
        <div className="canvasSidebar__accordionContent">
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem>
              <EuiStat title={total} description={strings.getTotalLabel()} titleSize="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat title={ready} description={strings.getLoadedLabel()} titleSize="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat title={error} description={strings.getFailedLabel()} titleSize="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={progress + '%'}
                description={strings.getProgressLabel()}
                titleSize="xs"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiAccordion>
    </div>
  );
};

ElementConfig.propTypes = {
  elementStats: PropTypes.object,
};
