/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { first, sortByOrder } from 'lodash';
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
            Type:&nbsp;
            <strong>{beat.type}</strong>.
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            Version:&nbsp;
            <strong>{beat.version}</strong>.
          </EuiText>
        </EuiFlexItem>
        {/* TODO: We need a populated field before we can run this code
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            Uptime: <strong>12min.</strong>
          </EuiText>
        </EuiFlexItem> */}
        {beat.full_tags &&
          beat.full_tags.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                Last Config Update:{' '}
                <strong>
                  {moment(
                    first(sortByOrder(beat.full_tags, 'last_updated')).last_updated
                  ).fromNow()}
                </strong>
                .
              </EuiText>
            </EuiFlexItem>
          )}
      </EuiFlexGroup>
    ) : (
      <div>Beat not found</div>
    )}
  </div>
);
