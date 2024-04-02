/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiIcon, EuiPopover, useEuiTheme } from '@elastic/eui';
import { WaterfallMarkerTrend } from './waterfall_marker_trend';

export function WaterfallMarkerIcon({ field, label }: { field: string; label: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  if (!field) {
    return (
      <EuiIcon
        aria-label={i18n.translate('xpack.synthetics.synthetics.markers.noFieldIcon.label', {
          defaultMessage: 'An icon indicating that this marker has no field associated with it',
        })}
        type="dot"
        size="m"
      />
    );
  }

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelStyle={{ paddingBottom: 0, paddingLeft: 4 }}
      zIndex={100}
      css={{ top: 4 }}
      button={
        <EuiButtonIcon
          data-test-subj="syntheticsWaterfallMarkerIconButton"
          css={{ color: euiTheme.colors.mediumShade }}
          aria-label={i18n.translate(
            'xpack.synthetics.synthetics.markers.openEmbeddableButton.label',
            {
              defaultMessage: 'Use this icon button to show metrics for this annotation marker.',
            }
          )}
          iconType="dot"
          iconSize="m"
          onClick={() => setIsOpen((prevState) => !prevState)}
        />
      }
    >
      <WaterfallMarkerTrend title={label} field={field} />
    </EuiPopover>
  );
}
