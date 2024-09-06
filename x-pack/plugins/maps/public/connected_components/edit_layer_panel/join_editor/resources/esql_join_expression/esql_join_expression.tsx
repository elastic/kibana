/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiExpression } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JoinField } from '../..';
import {
  ESESQLTermSourceDescriptor,
  JoinSourceDescriptor,
} from '../../../../../../common/descriptor_types';
import { ESQLJoinPopoverContent } from './esql_join_popover_content';

interface Props {
  sourceDescriptor: Partial<ESESQLTermSourceDescriptor>;
  onSourceDescriptorChange: (sourceDescriptor: Partial<JoinSourceDescriptor>) => void;

  // Left field props
  leftValue?: string;
  leftFields: JoinField[];
  onLeftFieldChange: (leftField: string) => void;
}

export function ESQLJoinExpression(props: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  console.log({ isPopoverOpen });

  // const { geoField } = props.sourceDescriptor;
  // const expressionValue =
  //   geoField !== undefined
  //     ? i18n.translate('xpack.maps.spatialJoinExpression.value', {
  //         defaultMessage: 'features from {geoField}',
  //         values: { geoField },
  //       })
  //     : i18n.translate('xpack.maps.spatialJoinExpression.emptyValue', {
  //         defaultMessage: '-- configure spatial join --',
  //       });

  const expressionValue = `FROM foobar`;

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
          description={i18n.translate('xpack.maps.esqlJoinExpressions.description', {
            defaultMessage: 'Join with',
          })}
          uppercase={false}
          value={expressionValue}
        />
      }
      repositionOnScroll={true}
    >
      <ESQLJoinPopoverContent
        sourceDescriptor={props.sourceDescriptor}
        onSourceDescriptorChange={props.onSourceDescriptorChange}
        leftSourceName={props.leftSourceName}
        leftValue={props.leftValue}
        leftFields={props.leftFields}
      />
    </EuiPopover>
  );
}
