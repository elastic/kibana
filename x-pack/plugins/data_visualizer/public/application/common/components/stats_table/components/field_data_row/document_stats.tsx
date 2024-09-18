/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';

import React from 'react';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { roundToDecimalPlace } from '@kbn/ml-number-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { SUPPORTED_FIELD_TYPES } from '../../../../../../../common/constants';
import { useDataVisualizerKibana } from '../../../../../kibana_context';
import { isIndexBasedFieldVisConfig } from '../../../../../../../common/types/field_vis_config';
import type { FieldDataRowProps } from '../../types/field_data_row';

interface Props extends FieldDataRowProps {
  showIcon?: boolean;
  totalCount?: number;
}
export const DocumentStat = ({ config, showIcon, totalCount }: Props) => {
  const { stats, type } = config;
  const {
    services: { fieldFormats },
  } = useDataVisualizerKibana();

  if (stats === undefined) return null;

  const { count, sampleCount } = stats;

  const total = Math.min(sampleCount ?? Infinity, totalCount ?? Infinity);

  // If field exists is docs but we don't have count stats then don't show
  // Otherwise if field doesn't appear in docs at all, show 0%
  const valueCount =
    count ?? (isIndexBasedFieldVisConfig(config) && config.existsInDocs === true ? undefined : 0);
  const docsPercent =
    valueCount !== undefined && total !== undefined
      ? `(${total === 0 ? 0 : roundToDecimalPlace((valueCount / total) * 100)}%)`
      : null;

  const content = (
    <EuiText size={'xs'}>
      {fieldFormats
        .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
        .convert(valueCount)}{' '}
      {docsPercent}
    </EuiText>
  );

  const tooltipContent =
    type === SUPPORTED_FIELD_TYPES.TEXT ? (
      <FormattedMessage
        id="xpack.dataVisualizer.sampledPercentageForTextFieldsMsg"
        defaultMessage="The % of documents for text fields is calculated from a sample of {sampledDocumentsFormatted} {sampledDocuments, plural, one {record} other {records}}."
        values={{
          sampledDocuments: sampleCount,
          sampledDocumentsFormatted: (
            <strong>
              {fieldFormats
                .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                .convert(sampleCount)}
            </strong>
          ),
        }}
      />
    ) : null;

  const icon = showIcon ? (
    type === SUPPORTED_FIELD_TYPES.TEXT ? (
      <EuiToolTip content={tooltipContent}>
        <EuiIcon type="partial" size={'m'} className={'columnHeader__icon'} />
      </EuiToolTip>
    ) : (
      <EuiIcon type="document" size={'m'} className={'columnHeader__icon'} />
    )
  ) : null;

  return valueCount !== undefined ? (
    <>
      {icon}
      <EuiToolTip content={tooltipContent}>{content}</EuiToolTip>
    </>
  ) : null;
};
