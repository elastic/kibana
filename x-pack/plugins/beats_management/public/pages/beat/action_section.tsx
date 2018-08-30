/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { CMPopulatedBeat } from '../../../common/domain_types';

interface BeatDetailsActionSectionProps {
  beat: CMPopulatedBeat | undefined;
}

export const BeatDetailsActionSection = ({ beat }: BeatDetailsActionSectionProps) => (
  <div>
    {beat ? (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            Version:&nbsp;
            <strong>{beat.version}</strong>.
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {/* TODO: What field is used to populate this value? */}
          <EuiText size="xs">
            Uptime: <strong>12min.</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            Last Config Update: <strong>{moment(beat.last_updated).fromNow()}</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      <div>Beat not found</div>
    )}
  </div>
);
