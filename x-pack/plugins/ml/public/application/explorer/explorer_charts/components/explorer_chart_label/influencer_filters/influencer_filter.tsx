/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { ENTITY_FIELD_OPERATIONS } from '../../../../../../../common/util/anomaly_utils';

type Operation = '+' | '-';
interface InfluencerFilterProps {
  onFilter: (params: {
    influencerFieldName: string;
    influencerFieldValue: string;
    operation: Operation;
  }) => void;
  influencerFieldName: string;
  influencerFieldValue: string;
}
export const InfluencerFilter: FC<InfluencerFilterProps> = ({
  onFilter,
  influencerFieldName,
  influencerFieldValue,
}) => {
  return (
    <React.Fragment>
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.ml.influencersCell.addFilterTooltip"
            defaultMessage="Add filter"
          />
        }
      >
        <EuiButtonIcon
          size="s"
          className="filter-button"
          onClick={() =>
            onFilter({
              influencerFieldName,
              influencerFieldValue,
              operation: ENTITY_FIELD_OPERATIONS.ADD,
            })
          }
          iconType="plusInCircle"
          aria-label={i18n.translate('xpack.ml.influencersCell.addFilterAriaLabel', {
            defaultMessage: 'Add filter',
          })}
        />
      </EuiToolTip>
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.ml.influencersCell.removeFilterTooltip"
            defaultMessage="Remove filter"
          />
        }
      >
        <EuiButtonIcon
          size="s"
          className="filter-button"
          onClick={() =>
            onFilter({
              influencerFieldName,
              influencerFieldValue,
              operation: ENTITY_FIELD_OPERATIONS.REMOVE,
            })
          }
          iconType="minusInCircle"
          aria-label={i18n.translate('xpack.ml.influencersCell.removeFilterAriaLabel', {
            defaultMessage: 'Remove filter',
          })}
        />
      </EuiToolTip>
    </React.Fragment>
  );
};
