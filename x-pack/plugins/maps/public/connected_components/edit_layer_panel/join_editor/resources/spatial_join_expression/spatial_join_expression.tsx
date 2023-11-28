/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiExpression } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ESDistanceSourceDescriptor,
  JoinSourceDescriptor,
} from '../../../../../../common/descriptor_types';
import { SpatialJoinPopoverContent } from './spatial_join_popover_content';

interface Props {
  sourceDescriptor: Partial<ESDistanceSourceDescriptor>;
  onSourceDescriptorChange: (sourceDescriptor: Partial<JoinSourceDescriptor>) => void;
}

export function SpatialJoinExpression(props: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { geoField } = props.sourceDescriptor;
  const expressionValue =
    geoField !== undefined
      ? i18n.translate('xpack.maps.spatialJoinExpression.value', {
          defaultMessage: 'features from {geoField}',
          values: { geoField },
        })
      : i18n.translate('xpack.maps.spatialJoinExpression.emptyValue', {
          defaultMessage: '-- configure spatial join --',
        });

  return (
    <EuiPopover
      id={props.sourceDescriptor.id}
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
      }}
      ownFocus
      initialFocus="body" /* avoid initialFocus on Combobox */
      anchorPosition="leftCenter"
      button={
        <EuiExpression
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
          description={i18n.translate('xpack.maps.spatialJoinExpression.description', {
            defaultMessage: 'Join with',
          })}
          uppercase={false}
          value={expressionValue}
        />
      }
      repositionOnScroll={true}
    >
      <SpatialJoinPopoverContent
        sourceDescriptor={props.sourceDescriptor}
        onSourceDescriptorChange={props.onSourceDescriptorChange}
      />
    </EuiPopover>
  );
}
