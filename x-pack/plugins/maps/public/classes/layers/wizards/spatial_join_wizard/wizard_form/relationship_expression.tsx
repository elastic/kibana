/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiExpression, EuiPopover } from '@elastic/eui';
import { KM_ABBREVIATION, DistanceForm } from './distance_form';

interface Props {
  distance: number;
  onDistanceChange: (distance: number) => void;
}

export function RelationshipExpression(props: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  function closePopover() {
    setIsPopoverOpen(false);
  }

  return (
    <EuiPopover
      id="spatialJoinRelationship"
      button={
        <EuiExpression
          color="subdued"
          description={i18n.translate(
            'xpack.maps.spatialJoin.wizardForm.withinExpressionDescription',
            {
              defaultMessage: 'within',
            }
          )}
          value={i18n.translate('xpack.maps.spatialJoin.wizardForm.withinExpressionValue', {
            defaultMessage: '{distance} {units} of layer features',
            values: {
              distance: props.distance,
              units: KM_ABBREVIATION,
            },
          })}
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
          uppercase={false}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="s"
      anchorPosition="downCenter"
      repositionOnScroll={true}
    >
      <DistanceForm
        initialDistance={props.distance}
        onDistanceChange={props.onDistanceChange}
        onClose={closePopover}
      />
    </EuiPopover>
  );
}
