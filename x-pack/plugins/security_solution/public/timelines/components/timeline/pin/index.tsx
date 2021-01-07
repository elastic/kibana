/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, IconSize } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React from 'react';

import { TimelineType, TimelineTypeLiteral } from '../../../../../common/types/timeline';

import * as i18n from '../body/translations';

export type PinIcon = 'pin' | 'pinFilled';

export const getPinIcon = (pinned: boolean): PinIcon => (pinned ? 'pinFilled' : 'pin');

interface Props {
  ariaLabel?: string;
  allowUnpinning: boolean;
  iconSize?: IconSize;
  timelineType?: TimelineTypeLiteral;
  onClick?: () => void;
  pinned: boolean;
}

export const Pin = React.memo<Props>(
  ({ ariaLabel, allowUnpinning, iconSize = 'm', onClick = noop, pinned, timelineType }) => {
    const isTemplate = timelineType === TimelineType.template;
    const defaultAriaLabel = isTemplate ? i18n.DISABLE_PIN : pinned ? i18n.PINNED : i18n.UNPINNED;
    const pinAriaLabel = ariaLabel != null ? ariaLabel : defaultAriaLabel;

    return (
      <EuiButtonIcon
        aria-label={pinAriaLabel}
        data-test-subj="pin"
        iconSize={iconSize}
        iconType={getPinIcon(pinned)}
        onClick={onClick}
        isDisabled={isTemplate || !allowUnpinning}
      />
    );
  }
);

Pin.displayName = 'Pin';
