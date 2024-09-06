/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React  from 'react';
import { i18n } from '@kbn/i18n';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { ExpressionPreview } from '../common/expression_preview';
import {
  ESTermSourceDescriptor,
  JoinSourceDescriptor,
} from '../../../../../../common/descriptor_types';
import type { JoinField } from '../../join_editor';
import { TermJoinPopoverContent } from './term_join_popover_content';

interface Props {
  // Left source props (static - can not change)
  leftSourceName?: string;

  // Left field props
  leftValue?: string;
  leftFields: JoinField[];
  onLeftFieldChange: (leftField: string) => void;

  // Right source props
  sourceDescriptor: Partial<ESTermSourceDescriptor>;
  onSourceDescriptorChange: (sourceDescriptor: Partial<JoinSourceDescriptor>) => void;
  rightFields: DataViewField[];
}

export function TermJoinExpression(props: Props) {
  const { size, term } = props.sourceDescriptor;
  const expressionValue =
    term !== undefined
      ? i18n.translate('xpack.maps.termJoinExpression.value', {
          defaultMessage: '{topTerms} terms from {term}',
          values: {
            topTerms:
              size !== undefined
                ? i18n.translate('xpack.maps.termJoinExpression.topTerms', {
                    defaultMessage: 'top {size}',
                    values: { size },
                  })
                : '',
            term,
          },
        })
      : i18n.translate('xpack.maps.termJoinExpression.placeholder', {
          defaultMessage: '-- configure term join --',
        });

  function renderTermJoinPopup() {
    return (
      <TermJoinPopoverContent
        leftSourceName={props.leftSourceName}
        leftValue={props.leftValue}
        leftFields={props.leftFields}
        onLeftFieldChange={props.onLeftFieldChange}
        sourceDescriptor={props.sourceDescriptor}
        onSourceDescriptorChange={props.onSourceDescriptorChange}
        rightFields={props.rightFields}
      />
    );
  }

  return (
    <ExpressionPreview
      previewText={expressionValue}
      renderPopup={renderTermJoinPopup}
      popOverId={props.sourceDescriptor.id}
    />
  );
}
