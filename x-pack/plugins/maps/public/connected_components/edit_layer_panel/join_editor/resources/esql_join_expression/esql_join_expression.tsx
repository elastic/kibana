/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ExpressionPreview } from '../common/expression_preview';
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
  const expressionValue =
    props.sourceDescriptor.term !== undefined && props.sourceDescriptor.esql !== undefined
      ? i18n.translate('xpack.maps.termJoinExpression.value', {
          defaultMessage: '{term}-field from {esql}',
          values: {
            term: props.sourceDescriptor.term || '',
            esql: props.sourceDescriptor.esql,
          },
        })
      : i18n.translate('xpack.maps.termJoinExpression.placeholder', {
          defaultMessage: '-- configure ES|QL join --',
        });

  function renderESQLJoinPopup() {
    return (
      <ESQLJoinPopoverContent
        leftSourceName={props.leftSourceName}
        leftValue={props.leftValue}
        leftFields={props.leftFields}
        onLeftFieldChange={props.onLeftFieldChange}
        sourceDescriptor={props.sourceDescriptor}
        onSourceDescriptorChange={props.onSourceDescriptorChange}
      />
    );
  }

  return (
    <ExpressionPreview
      previewText={expressionValue}
      renderPopup={renderESQLJoinPopup}
      popOverId={props.sourceDescriptor.id}
    />
  );
}
